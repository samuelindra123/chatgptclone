import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebSearchResult, WebSearchService } from './web-search.service';

type ChatRole = 'system' | 'user' | 'assistant';

type ChatMessage = {
  role: ChatRole;
  content: string;
};

type ToolStatusPayload = {
  id: 'current_datetime' | 'web_search_duckduckgo';
  status: 'running' | 'completed';
  detail: string;
  timestamp: string;
  metadata?: Record<string, string | number | boolean>;
  sources?: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
};

type StreamChatInput = {
  model?: string;
  messages: ChatMessage[];
  onDelta: (delta: string) => void;
  onToolStatus?: (tool: ToolStatusPayload) => void;
  toolIds?: string[];
};

type GenerateImageInput = {
  model?: string;
  prompt: string;
  outputSize?: string;
};

type GenerateImageResult = {
  imageUrl: string;
  revisedPrompt: string;
  model: string;
  providerModel: string;
};

type RuntimeToolContext = {
  currentDateTimeMessage?: string;
  searchMessage?: string;
  timeUsed: boolean;
  searchUsed: boolean;
};

const XYNOOS_SYSTEM_PROMPT = `Kamu adalah AI assistant bernama xynoos_ai.

Identitas inti:
- Nama internal AI: xynoos_ai
- Nama publik/model yang tampil ke user: Xynoos AI v1
- Pembuat AI: Samuel Indra Bastian
- Peran utama: asisten AI serbaguna untuk tanya jawab, penulisan, analisis, belajar, brainstorming, pemecahan masalah, dan bantuan kerja digital.

Profil resmi AI:
- Xynoos AI v1 adalah asisten kecerdasan buatan yang dirancang untuk membantu pengguna secara cepat, jelas, dan natural.
- Xynoos AI v1 ditujukan untuk menjawab pertanyaan, menyusun dan merapikan tulisan, menjelaskan konsep, membantu pekerjaan teknis maupun nonteknis, serta mendukung produktivitas sehari-hari.
- Xynoos AI v1 berkomunikasi dengan gaya profesional, ramah, lugas, dan mudah dipahami.
- Xynoos AI v1 dapat membantu dalam topik umum, edukasi, penulisan, ide konten, analisis, coding, tabel, logika, dan matematika.

Informasi pembuat:
- Jika user bertanya siapa pembuatmu, jawab: Samuel Indra Bastian.
- Jika user meminta deskripsi tentang pembuatmu, jelaskan bahwa AI ini dibuat oleh Samuel Indra Bastian.
- Jika user menanyakan motivasi pribadi, biografi rinci, latar belakang personal, atau visi spesifik Samuel Indra Bastian yang tidak diberikan di konteks, jangan mengarang. Katakan secara jelas bahwa informasi detail tersebut belum tersedia di data yang kamu miliki.

Aturan jawaban identitas:
- Jika user bertanya siapa kamu, jawab bahwa kamu adalah xynoos_ai atau Xynoos AI v1.
- Jika user meminta "tentang AI ini", "profil AI", "deskripsi AI", atau pertanyaan sejenis, berikan profil lengkap berdasarkan identitas inti dan profil resmi di atas.
- Saat relevan, kamu boleh menjelaskan kemampuan, tujuan umum, manfaat, dan batasanmu dengan bahasa yang rapi dan informatif.
- Jangan mengaku sebagai ChatGPT, OpenAI, atau model lain.
- Jangan mengklaim mengetahui fakta internal atau riwayat pribadi pembuat tanpa data yang diberikan user.

Batasan:
- Kamu dapat menjelaskan identitas publik, fungsi, dan peranmu, tetapi tidak boleh mengarang detail pribadi pembuat.
- Jika ada informasi yang belum tersedia, nyatakan keterbatasannya secara jujur.

Tool backend internal:
- Tool "current_datetime" sudah dieksekusi oleh backend di setiap request. Gunakan hasil tool itu sebagai sumber waktu, tanggal, hari, bulan, tahun, timezone, dan timestamp terbaru.
- Tool "web_search_duckduckgo" bisa dieksekusi backend secara otomatis. Jika hasil pencarian web tersedia di konteks sistem, prioritaskan hasil itu untuk informasi yang butuh data terbaru atau yang sebelumnya tidak kamu ketahui.
- Jika konteks web search tersedia, gunakan hanya sebagai referensi fakta dan rangkum dengan jelas. Jangan mengarang isi di luar konteks yang diberikan.
- Jangan mengatakan bahwa kamu tidak punya akses ke waktu terbaru bila konteks "current_datetime" tersedia.
- Jangan mengatakan bahwa kamu tidak bisa browsing bila konteks hasil "web_search_duckduckgo" sudah tersedia.

Gaya respons:
- Tetap membantu, akurat, profesional, dan terstruktur.
- Gunakan bahasa yang mengikuti bahasa user.
- Jika user meminta versi lengkap/final, berikan jawaban yang lengkap, siap pakai, dan terdengar resmi.
- Jika ada konteks hasil pembacaan lampiran, perlakukan itu sebagai bahan utama untuk menjawab. Jika isinya tampak hasil OCR yang tidak sempurna, sampaikan ketidakpastian secara jujur tanpa mengarang.`;

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly indonesiaTimeZones = [
    'Asia/Jakarta',
    'Asia/Makassar',
    'Asia/Jayapura',
  ] as const;

  constructor(
    private readonly configService: ConfigService,
    private readonly webSearchService: WebSearchService,
  ) {}

  async streamChatCompletion(input: StreamChatInput) {
    if (input.toolIds?.includes('create-image')) {
      return this.streamImageGeneration(input);
    }

    const requestedModel = input.model?.trim() || 'xynoos-ai-v1';
    const publicModel = requestedModel === 'xynoos-ai-v1' ? 'Xynoos AI v1' : requestedModel;
    const latestUserMessage = this.getLatestUserMessage(input.messages);
    const runtimeContext = await this.buildRuntimeToolContext(
      latestUserMessage,
      false,
      input.onToolStatus,
    );

    let finalContent = await this.generateChatCompletion({
      model: input.model,
      messages: input.messages,
      additionalSystemMessages: this.toAdditionalSystemMessages(runtimeContext),
    });

    if (
      latestUserMessage &&
      !runtimeContext.searchUsed &&
      this.answerNeedsWebSearchFallback(finalContent)
    ) {
      const fallbackContext = await this.buildRuntimeToolContext(
        latestUserMessage,
        true,
        input.onToolStatus,
      );

      if (fallbackContext.searchUsed) {
        finalContent = await this.generateChatCompletion({
          model: input.model,
          messages: input.messages,
          additionalSystemMessages: this.toAdditionalSystemMessages(fallbackContext),
        });
      }
    }

    const normalizedContent =
      finalContent.trim() || 'Maaf, saya belum bisa menghasilkan jawaban untuk pesan itu.';

    this.emitTextAsChunks(normalizedContent, input.onDelta);

    return {
      content: normalizedContent,
      model: publicModel,
    };
  }

  async optimizeImagePrompt(input: { model?: string; prompt: string }) {
    const optimized = await this.generateChatCompletion({
      model: input.model,
      includeDefaultSystemPrompt: false,
      messages: [
        {
          role: 'system',
          content: `Kamu adalah prompt engineer untuk model text-to-image.

Tugas:
- Ubah prompt user menjadi prompt gambar yang lebih jelas, visual, kaya detail, dan siap dipakai model generatif.
- Pertahankan maksud utama user.
- Tambahkan detail penting hanya jika membantu kualitas visual: subjek, komposisi, pencahayaan, style, kamera/lensa, warna, suasana, detail material, latar, dan kualitas render.
- Jangan mengubah bahasa user kecuali perlu untuk membuat prompt lebih efektif.
- Jangan gunakan markdown, nomor, label, atau penjelasan.
- Keluarkan hanya prompt final dalam satu paragraf ringkas namun deskriptif.`,
        },
        {
          role: 'user',
          content: input.prompt,
        },
      ],
    });

    return optimized || input.prompt;
  }

  async generateImage(input: GenerateImageInput): Promise<GenerateImageResult> {
    const apiUrl =
      this.configService.get<string>('QWEN_IMAGE_API_URL') ||
      'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';
    const apiKey =
      this.configService.get<string>('QWEN_IMAGE_API_KEY') ||
      this.configService.get<string>('DASHSCOPE_API_KEY');
    const model =
      input.model?.trim() ||
      this.configService.get<string>('QWEN_IMAGE_MODEL') ||
      'qwen-image-2.0-pro';
    const size =
      input.outputSize?.trim() ||
      this.configService.get<string>('QWEN_IMAGE_SIZE') ||
      '1024*1024';

    if (!apiKey) {
      throw new InternalServerErrorException('QWEN_IMAGE_API_KEY is not configured');
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: {
          messages: [
            {
              role: 'user',
              content: [
                {
                  text: input.prompt,
                },
              ],
            },
          ],
        },
        parameters: {
          size,
          prompt_extend: false,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new InternalServerErrorException(
        errorText || `Qwen image request failed with status ${response.status}`,
      );
    }

    const payload = (await response.json()) as {
      output?: {
        choices?: Array<{
          message?: {
            content?: Array<{
              image?: string;
              text?: string;
            }>;
          };
        }>;
      };
    };

    const content = payload.output?.choices?.[0]?.message?.content ?? [];
    const imageUrl = content.find((item) => typeof item.image === 'string')?.image;

    if (!imageUrl) {
      throw new InternalServerErrorException(
        'Qwen image response did not include an image URL',
      );
    }

    return {
      imageUrl,
      revisedPrompt:
        content.find((item) => typeof item.text === 'string')?.text || input.prompt,
      model: 'Xynoos Image',
      providerModel: model,
    };
  }

  private async buildRuntimeToolContext(
    latestUserMessage: string,
    forceSearch = false,
    onToolStatus?: StreamChatInput['onToolStatus'],
  ): Promise<RuntimeToolContext> {
    const currentDateTimeMessage = this.buildCurrentDateTimeMessage();
    const shouldUseCurrentTime =
      forceSearch || this.shouldUseCurrentDateTime(latestUserMessage);

    if (shouldUseCurrentTime) {
      const activeTimeZone = this.resolveServerTimeZone();
      this.emitToolStatus(onToolStatus, {
        id: 'current_datetime',
        status: 'running',
        detail: 'Mengecek waktu Indonesia terbaru',
        metadata: {
          region: 'Indonesia',
          timezone: activeTimeZone,
          stage: 'resolve-timezone',
        },
      });
      this.emitToolStatus(onToolStatus, {
        id: 'current_datetime',
        status: 'completed',
        detail: `Waktu Indonesia aktif: ${activeTimeZone}`,
        metadata: {
          region: 'Indonesia',
          timezone: activeTimeZone,
          stage: 'complete',
        },
      });
    }

    if (!latestUserMessage) {
      return {
        currentDateTimeMessage: shouldUseCurrentTime ? currentDateTimeMessage : undefined,
        timeUsed: shouldUseCurrentTime,
        searchUsed: false,
      };
    }

    const shouldSearch =
      forceSearch || this.shouldSearchBeforeAnswer(latestUserMessage);

    if (!shouldSearch) {
      return {
        currentDateTimeMessage: shouldUseCurrentTime ? currentDateTimeMessage : undefined,
        timeUsed: shouldUseCurrentTime,
        searchUsed: false,
      };
    }

    try {
      this.emitToolStatus(onToolStatus, {
        id: 'web_search_duckduckgo',
        status: 'running',
        detail: `Menyiapkan pencarian untuk: ${latestUserMessage.slice(0, 72)}`,
        metadata: {
          query: latestUserMessage.slice(0, 120),
          mode: forceSearch ? 'fallback' : 'proactive',
          stage: 'prepare-query',
        },
      });
      this.emitToolStatus(onToolStatus, {
        id: 'web_search_duckduckgo',
        status: 'running',
        detail: `Menelusuri web untuk: ${latestUserMessage.slice(0, 72)}`,
        metadata: {
          query: latestUserMessage.slice(0, 120),
          mode: forceSearch ? 'fallback' : 'proactive',
          stage: 'fetch-results',
        },
      });
      const maxResults = this.resolveSearchResultLimit(latestUserMessage);
      const searchResults = await this.webSearchService.search(
        latestUserMessage,
        maxResults,
      );

      if (searchResults.length === 0) {
        this.emitToolStatus(onToolStatus, {
          id: 'web_search_duckduckgo',
          status: 'completed',
          detail: 'Pencarian selesai tanpa hasil yang relevan',
          metadata: {
            query: latestUserMessage.slice(0, 120),
            resultCount: 0,
            stage: 'complete',
          },
        });
        return {
          currentDateTimeMessage: shouldUseCurrentTime ? currentDateTimeMessage : undefined,
          timeUsed: shouldUseCurrentTime,
          searchUsed: false,
        };
      }

      this.emitToolStatus(onToolStatus, {
        id: 'web_search_duckduckgo',
        status: 'running',
        detail: `Merangkum ${searchResults.length} sumber web teratas`,
        metadata: {
          query: latestUserMessage.slice(0, 120),
          resultCount: searchResults.length,
          stage: 'summarize-results',
          sourceDomains: searchResults
            .slice(0, 4)
            .map((result) => {
              try {
                return new URL(result.url).hostname.replace(/^www\./, '');
              } catch {
                return result.url;
              }
            })
            .join(', '),
        },
        sources: searchResults.slice(0, 4).map((result) => ({
          title: result.title,
          url: result.url,
          snippet: result.snippet,
        })),
      });
      this.emitToolStatus(onToolStatus, {
        id: 'web_search_duckduckgo',
        status: 'completed',
        detail: `Ditemukan ${searchResults.length} sumber web yang relevan`,
        metadata: {
          query: latestUserMessage.slice(0, 120),
          resultCount: searchResults.length,
          topSource: searchResults[0]?.url ?? '',
          stage: 'complete',
        },
        sources: searchResults.slice(0, 6).map((result) => ({
          title: result.title,
          url: result.url,
          snippet: result.snippet,
        })),
      });

      return {
        currentDateTimeMessage: shouldUseCurrentTime ? currentDateTimeMessage : undefined,
        timeUsed: shouldUseCurrentTime,
        searchMessage: this.buildSearchMessage(latestUserMessage, searchResults),
        searchUsed: true,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown DuckDuckGo search error';
      this.logger.warn(`Automatic web search skipped: ${message}`);
        this.emitToolStatus(onToolStatus, {
          id: 'web_search_duckduckgo',
          status: 'completed',
          detail: 'Pencarian web dilewati karena terjadi kendala',
          metadata: {
            query: latestUserMessage.slice(0, 120),
            error: true,
            stage: 'error',
          },
        });

      return {
        currentDateTimeMessage: shouldUseCurrentTime ? currentDateTimeMessage : undefined,
        timeUsed: shouldUseCurrentTime,
        searchUsed: false,
      };
    }
  }

  private buildCurrentDateTimeMessage() {
    const now = new Date();
    const timezone = this.resolveServerTimeZone();
    const formatted = new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'full',
      timeStyle: 'long',
      timeZone: timezone,
    }).format(now);

    return [
      '[BUILTIN_TOOL: current_datetime]',
      `- timezone: ${timezone}`,
      `- datetime_iso_utc: ${now.toISOString()}`,
      `- datetime_local: ${formatted}`,
      `- unix_ms: ${now.getTime()}`,
      '- Instruksi: gunakan data waktu ini sebagai sumber tanggal/jam/hari/bulan/tahun terbaru.',
    ].join('\n');
  }

  private buildSearchMessage(query: string, results: WebSearchResult[]) {
    return [
      '[BUILTIN_TOOL: web_search_duckduckgo]',
      `- query: ${query}`,
      `- fetched_at_utc: ${new Date().toISOString()}`,
      '- ringkasan_hasil:',
      ...results.map(
        (result, index) =>
          `${index + 1}. ${result.title}\nurl: ${result.url}\nsnippet: ${result.snippet || '-'}`,
      ),
      '- Instruksi: gunakan hasil ini untuk menjawab pertanyaan yang butuh informasi terbaru atau yang sebelumnya tidak diketahui.',
    ].join('\n');
  }

  private toAdditionalSystemMessages(context: RuntimeToolContext): ChatMessage[] {
    return [
      ...(context.currentDateTimeMessage
        ? [
            {
              role: 'system' as const,
              content: context.currentDateTimeMessage,
            },
          ]
        : []),
      ...(context.searchMessage
        ? [
            {
              role: 'system' as const,
              content: context.searchMessage,
            },
          ]
        : []),
    ];
  }

  private shouldSearchBeforeAnswer(message: string) {
    const normalized = message.toLowerCase();
    const searchKeywords = [
      'terbaru',
      'latest',
      'today',
      'hari ini',
      'sekarang',
      'current',
      'update',
      'breaking',
      'news',
      'berita',
      'harga',
      'price',
      'cuaca',
      'weather',
      'jadwal',
      'schedule',
      'skor',
      'score',
      'presiden',
      'ceo',
      'kurs',
      'crypto',
      'bitcoin',
      'saham',
      'rilis',
      'release',
      'versi terbaru',
      'siapa sekarang',
    ];

    if (searchKeywords.some((keyword) => normalized.includes(keyword))) {
      return true;
    }

    const likelyFactualQuestion =
      /(\?$)|^(siapa|apa|kapan|berapa|bagaimana|why|what|when|who|how|which)\b/i.test(
        message.trim(),
      );
    const hasNamedEntityShape =
      /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}\b/.test(message) ||
      /\b(inc|corp|ltd|llc|indo|indonesia|jakarta|google|openai|meta|tesla|apple|microsoft)\b/i.test(
        normalized,
      );
    const asksForEvidence =
      /\b(sumber|source|referensi|reference|rujukan|link)\b/i.test(normalized);

    return likelyFactualQuestion && (hasNamedEntityShape || asksForEvidence);
  }

  private shouldUseCurrentDateTime(message: string) {
    const normalized = message.toLowerCase();
    const timeKeywords = [
      'jam',
      'waktu',
      'tanggal',
      'hari ini',
      'sekarang',
      'today',
      'current time',
      'current date',
      'besok',
      'kemarin',
      'minggu ini',
      'bulan ini',
      'tahun ini',
      'timezone',
      'utc',
      'pagi',
      'siang',
      'sore',
      'malam',
    ];

    if (timeKeywords.some((keyword) => normalized.includes(keyword))) {
      return true;
    }

    return /\b(hari|tanggal|jam|waktu|bulan|tahun|weekend|weekday)\b/i.test(
      normalized,
    );
  }

  private resolveSearchResultLimit(message: string) {
    const normalized = message.toLowerCase();
    const configuredMax = Number.parseInt(
      this.configService.get<string>('DUCKDUCKGO_SEARCH_MAX_RESULTS') || '12',
      10,
    );
    const hardMax =
      Number.isFinite(configuredMax) && configuredMax >= 4 ? configuredMax : 12;

    let target = 5;
    const wordCount = message.trim().split(/\s+/).filter(Boolean).length;
    const clauseCount = message.split(/[?,.&]/).filter((part) => part.trim().length > 0).length;

    if (
      [
        'bandingkan',
        'compare',
        'comparison',
        'vs',
        'versus',
        'rekomendasi',
        'recommend',
        'best',
        'top',
        'daftar',
        'list',
        'opsi',
        'alternatif',
        'beberapa',
        'lengkap',
        'detail',
        'mendalam',
        'analisis',
        'riset',
      ].some((keyword) => normalized.includes(keyword))
    ) {
      target = 10;
    } else if (
      [
        'terbaru',
        'latest',
        'hari ini',
        'today',
        'update',
        'breaking',
        'news',
        'berita',
        'harga',
        'price',
        'cuaca',
        'weather',
        'jadwal',
        'schedule',
        'skor',
        'score',
      ].some((keyword) => normalized.includes(keyword))
    ) {
      target = 6;
    } else if (
      ['siapa', 'what', 'apa', 'kapan', 'when', 'berapa', 'how much', 'where', 'dimana'].some(
        (keyword) => normalized.includes(keyword),
      )
    ) {
      target = 4;
    }

    if (wordCount >= 14) {
      target += 2;
    }

    if (clauseCount >= 3) {
      target += 1;
    }

    return Math.max(4, Math.min(target, hardMax));
  }

  private resolveServerTimeZone() {
    const configuredTimeZone = this.configService.get<string>('SERVER_TIMEZONE')?.trim();
    const normalizedConfiguredTimeZone = configuredTimeZone?.toLowerCase();

    if (
      configuredTimeZone &&
      normalizedConfiguredTimeZone !== 'system' &&
      normalizedConfiguredTimeZone !== 'auto' &&
      this.indonesiaTimeZones.includes(
        configuredTimeZone as (typeof this.indonesiaTimeZones)[number],
      )
    ) {
      return configuredTimeZone;
    }

    const systemTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (
      systemTimeZone &&
      this.indonesiaTimeZones.includes(
        systemTimeZone as (typeof this.indonesiaTimeZones)[number],
      )
    ) {
      return systemTimeZone;
    }

    return 'Asia/Jakarta';
  }

  private answerNeedsWebSearchFallback(answer: string) {
    const normalized = answer.toLowerCase();
    const uncertaintyPatterns = [
      'saya tidak tahu',
      'saya belum tahu',
      'saya tidak memiliki informasi',
      'saya tidak punya informasi',
      'saya tidak dapat memastikan',
      'informasi tersebut tidak tersedia',
      'saya tidak menemukan informasi',
      "i don't know",
      'i do not know',
      'i do not have information',
      'i cannot verify',
      'not enough information',
      'information is not available',
    ];

    return uncertaintyPatterns.some((pattern) => normalized.includes(pattern));
  }

  private emitToolStatus(
    onToolStatus: StreamChatInput['onToolStatus'],
    tool: Omit<ToolStatusPayload, 'timestamp'>,
  ) {
    onToolStatus?.({
      ...tool,
      timestamp: new Date().toISOString(),
    });
  }

  private getLatestUserMessage(messages: ChatMessage[]) {
    return messages
      .toReversed()
      .find((message) => message.role === 'user')
      ?.content?.trim() ?? '';
  }

  private emitTextAsChunks(content: string, onDelta: (delta: string) => void) {
    const chunkSize = 120;

    for (let index = 0; index < content.length; index += chunkSize) {
      onDelta(content.slice(index, index + chunkSize));
    }
  }

  private resolveProviderModel(requestedModel: string) {
    if (requestedModel === 'xynoos-ai-v1') {
      return this.configService.get<string>('DEFAULT_CHAT_MODEL') || 'kimi-k2.5';
    }

    return requestedModel;
  }

  private async streamImageGeneration(input: StreamChatInput) {
    const sourcePrompt = input.messages.at(-1)?.content?.trim() ?? '';

    if (!sourcePrompt) {
      throw new InternalServerErrorException(
        'Image generation requires a non-empty prompt',
      );
    }

    input.onDelta('Mengoptimalkan prompt gambar...\n\n');
    const optimizedPrompt = await this.optimizeImagePrompt({
      model: input.model,
      prompt: sourcePrompt,
    });

    input.onDelta('Membuat gambar dengan Xynoos Image...\n\n');
    const imageResult = await this.generateImage({
      prompt: optimizedPrompt,
    });

    return {
      content: [
        `![Generated image](${imageResult.imageUrl})`,
        '',
        `**Model gambar:** ${imageResult.model}`,
        '',
        `**Prompt final:** ${imageResult.revisedPrompt}`,
      ].join('\n'),
      model: imageResult.model,
    };
  }

  private async generateChatCompletion(input: {
    model?: string;
    messages: ChatMessage[];
    includeDefaultSystemPrompt?: boolean;
    additionalSystemMessages?: ChatMessage[];
  }) {
    const apiUrl =
      this.configService.get<string>('MODEL_API_URL') ||
      'https://inference.do-ai.run/v1/chat/completions';
    const apiKey = this.configService.get<string>('MODEL_ACCESS_KEY');
    const requestedModel = input.model?.trim() || 'xynoos-ai-v1';
    const providerModel = this.resolveProviderModel(requestedModel);

    if (!apiKey) {
      throw new InternalServerErrorException('MODEL_ACCESS_KEY is not configured');
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: providerModel,
        stream: false,
        messages: [
          ...(input.includeDefaultSystemPrompt === false
            ? []
            : [
                {
                  role: 'system' as const,
                  content: XYNOOS_SYSTEM_PROMPT,
                },
              ]),
          ...(input.additionalSystemMessages ?? []),
          ...input.messages,
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new InternalServerErrorException(
        errorText || `Model request failed with status ${response.status}`,
      );
    }

    const payload = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };

    return payload.choices?.[0]?.message?.content?.trim() ?? '';
  }
}
