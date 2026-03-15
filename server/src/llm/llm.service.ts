import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type ChatRole = 'system' | 'user' | 'assistant';

type ChatMessage = {
  role: ChatRole;
  content: string;
};

type StreamChatInput = {
  model?: string;
  messages: ChatMessage[];
  onDelta: (delta: string) => void;
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

Gaya respons:
- Tetap membantu, akurat, profesional, dan terstruktur.
- Gunakan bahasa yang mengikuti bahasa user.
- Jika user meminta versi lengkap/final, berikan jawaban yang lengkap, siap pakai, dan terdengar resmi.
- Jika ada konteks hasil pembacaan lampiran, perlakukan itu sebagai bahan utama untuk menjawab. Jika isinya tampak hasil OCR yang tidak sempurna, sampaikan ketidakpastian secara jujur tanpa mengarang.`;

@Injectable()
export class LlmService {
  constructor(private readonly configService: ConfigService) {}

  async streamChatCompletion(input: StreamChatInput) {
    if (input.toolIds?.includes('create-image')) {
      return this.streamImageGeneration(input);
    }

    const apiUrl =
      this.configService.get<string>('MODEL_API_URL') ||
      'https://inference.do-ai.run/v1/chat/completions';
    const apiKey = this.configService.get<string>('MODEL_ACCESS_KEY');
    const requestedModel = input.model?.trim() || 'xynoos-ai-v1';
    const publicModel = requestedModel === 'xynoos-ai-v1' ? 'Xynoos AI v1' : requestedModel;
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
        stream: true,
        messages: [
          {
            role: 'system',
            content: XYNOOS_SYSTEM_PROMPT,
          },
          ...input.messages,
        ],
      }),
    });

    if (!response.ok || !response.body) {
      const errorText = await response.text().catch(() => '');
      throw new InternalServerErrorException(
        errorText || `Model request failed with status ${response.status}`,
      );
    }

    const decoder = new TextDecoder();
    const reader = response.body.getReader();
    let buffer = '';
    let fullText = '';
    let resolvedModel = publicModel;

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';

      for (const eventBlock of events) {
        const parsed = this.parseEventBlock(eventBlock);

        if (!parsed) {
          continue;
        }

        if (parsed === '[DONE]') {
          return {
            content: fullText.trim(),
          model: resolvedModel,
        };
        }

        const payload = JSON.parse(parsed) as {
          model?: string;
          choices?: Array<{
            delta?: {
              content?: string;
            };
          }>;
        };

        const delta = payload.choices?.[0]?.delta?.content ?? '';

        if (!delta) {
          continue;
        }

        fullText += delta;
        input.onDelta(delta);
      }
    }

    return {
      content: fullText.trim(),
      model: resolvedModel,
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

  private resolveProviderModel(requestedModel: string) {
    if (requestedModel === 'xynoos-ai-v1') {
      return (
        this.configService.get<string>('DEFAULT_CHAT_MODEL') || 'kimi-k2.5'
      );
    }

    return requestedModel;
  }

  private parseEventBlock(block: string) {
    const dataLines = block
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice('data:'.length).trim());

    if (dataLines.length === 0) {
      return null;
    }

    return dataLines.join('\n');
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
