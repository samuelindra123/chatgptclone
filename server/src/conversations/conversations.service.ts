import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { MessageRole } from '@prisma/client';
import type { Response } from 'express';
import { AttachmentsService } from '../attachments/attachments.service';
import { DatabaseService } from '../database/database.service';
import { LlmService } from '../llm/llm.service';
import { AppwriteStorageService } from '../storage/appwrite-storage.service';

type ConversationMutationInput = {
  conversationId?: string;
  content?: string;
  attachmentCount?: number | string;
  model?: string;
  toolIds?: string | string[];
};

type StoredAttachment = {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  url: string;
};

@Injectable()
export class ConversationsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly llmService: LlmService,
    private readonly attachmentsService: AttachmentsService,
    private readonly appwriteStorageService: AppwriteStorageService,
  ) {}

  async listConversations(userId: string) {
    const conversations = await this.databaseService.conversation.findMany({
      where: {
        userId,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });

    return {
      conversations: conversations.map((conversation) => ({
        id: conversation.id,
        title: conversation.title,
        updatedAt: conversation.updatedAt,
        preview: conversation.messages[0]?.content ?? '',
      })),
    };
  }

  async listGeneratedImages(userId: string) {
    const messages = await this.databaseService.message.findMany({
      where: {
        role: MessageRole.ASSISTANT,
        content: {
          contains: '![Generated image](',
        },
        conversation: {
          userId,
        },
      },
      include: {
        conversation: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      images: messages
        .map((message) => this.extractGeneratedImage(message))
        .filter((image): image is NonNullable<typeof image> => image !== null),
    };
  }

  async getConversation(userId: string, conversationId: string) {
    const conversation = await this.databaseService.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return {
      conversation: {
        id: conversation.id,
        title: conversation.title,
        updatedAt: conversation.updatedAt,
        createdAt: conversation.createdAt,
      },
      messages: conversation.messages.map((message) =>
        this.serializeMessage(message),
      ),
    };
  }

  async createConversation(userId: string, input: ConversationMutationInput) {
    const payload = this.normalizeInput(input);
    const title = this.buildConversationTitle(
      payload.content,
      payload.attachmentCount,
    );

    const conversation = await this.databaseService.conversation.create({
      data: {
        userId,
        title,
        messages: {
          create: {
            role: MessageRole.USER,
            content: payload.content,
            attachmentCount: payload.attachmentCount,
          },
        },
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    return {
      conversation: {
        id: conversation.id,
        title: conversation.title,
        updatedAt: conversation.updatedAt,
        createdAt: conversation.createdAt,
      },
      messages: conversation.messages.map((message) =>
        this.serializeMessage(message),
      ),
    };
  }

  async addMessage(
    userId: string,
    conversationId: string,
    input: ConversationMutationInput,
  ) {
    const payload = this.normalizeInput(input);
    const conversation = await this.databaseService.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    await this.databaseService.message.create({
      data: {
        conversationId,
        role: MessageRole.USER,
        content: payload.content,
        attachmentCount: payload.attachmentCount,
      },
    });

    const updatedConversation = await this.databaseService.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        updatedAt: new Date(),
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    return {
      conversation: {
        id: updatedConversation.id,
        title: updatedConversation.title,
        updatedAt: updatedConversation.updatedAt,
        createdAt: updatedConversation.createdAt,
      },
      messages: updatedConversation.messages.map((message) =>
        this.serializeMessage(message),
      ),
    };
  }

  async renameConversation(
    userId: string,
    conversationId: string,
    title: string | undefined,
  ) {
    const normalizedTitle = title?.trim() ?? '';

    if (!normalizedTitle) {
      throw new BadRequestException('Conversation title is required');
    }

    const conversation = await this.databaseService.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const updatedConversation = await this.databaseService.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        title: normalizedTitle,
      },
    });

    return {
      conversation: {
        id: updatedConversation.id,
        title: updatedConversation.title,
        updatedAt: updatedConversation.updatedAt,
        createdAt: updatedConversation.createdAt,
      },
    };
  }

  async deleteConversation(userId: string, conversationId: string) {
    const conversation = await this.databaseService.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    await this.databaseService.conversation.delete({
      where: {
        id: conversationId,
      },
    });

    return {
      success: true,
    };
  }

  async streamMessage(
    userId: string,
    input: ConversationMutationInput,
    files: Express.Multer.File[],
    response: Response,
  ) {
    const payload = this.normalizeInput(input);
    let assistantMessageId: string | null = null;
    let assistantContent = '';

    response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.flushHeaders();

    try {
      const conversation = payload.conversationId
        ? await this.appendUserMessage(userId, payload.conversationId, payload)
        : await this.createConversation(userId, payload);
      const userMessage = conversation.messages.at(-1);

      if (!userMessage) {
        throw new InternalServerErrorException('Failed to create user message');
      }

      const assistantMessage = await this.databaseService.message.create({
        data: {
          conversationId: conversation.conversation.id,
          role: MessageRole.ASSISTANT,
          content: '',
          attachmentCount: 0,
        },
      });

      assistantMessageId = assistantMessage.id;

      const storedAttachments =
        await this.appwriteStorageService.uploadConversationFiles({
          userId,
          conversationId: conversation.conversation.id,
          messageId: userMessage.id,
          files,
        });
      const normalizedStoredAttachments = storedAttachments.flatMap((attachment) =>
        attachment.viewUrl
          ? [
              {
                id: attachment.id,
                name: attachment.name,
                mimeType: attachment.mimeType,
                size: attachment.size,
                url: attachment.viewUrl,
              },
            ]
          : [],
      );

      if (normalizedStoredAttachments.length > 0) {
        await this.databaseService.message.update({
          where: {
            id: userMessage.id,
          },
          data: {
            attachmentsJson: JSON.stringify(normalizedStoredAttachments),
          },
        });
      }

      this.writeEvent(response, 'meta', {
        conversation: conversation.conversation,
        userMessageId: userMessage.id,
        assistantMessageId: assistantMessage.id,
        model: payload.model || 'xynoos-ai-v1',
        attachmentsStored: storedAttachments.length,
        uploadedAttachments: normalizedStoredAttachments.map((attachment) => ({
          id: attachment.id,
          name: attachment.name,
          mimeType: attachment.mimeType,
          viewUrl: attachment.url,
        })),
      });

      const messageHistory = conversation.messages
        .filter((message) => message.role !== MessageRole.SYSTEM || message.content)
        .map((message) => ({
          role: this.toChatRole(message.role),
          content: message.content,
        }));
      const attachmentContext = await this.attachmentsService.buildAttachmentContext(
        files,
      );
      const enrichedMessageHistory =
        attachmentContext && messageHistory.length > 0
          ? [
              ...messageHistory.slice(0, -1),
              {
                ...messageHistory.at(-1)!,
                content: this.combineUserMessageWithAttachmentContext(
                  messageHistory.at(-1)!.content,
                  attachmentContext,
                  storedAttachments.map((attachment) => ({
                    name: attachment.name,
                    mimeType: attachment.mimeType,
                    size: attachment.size,
                    viewUrl: attachment.viewUrl,
                  })),
                ),
              },
            ]
          : messageHistory;

      const result = await this.llmService.streamChatCompletion({
        model: payload.model,
        messages: enrichedMessageHistory,
        onDelta: (delta) => {
          assistantContent += delta;
          this.writeEvent(response, 'delta', { text: delta });
        },
        toolIds: payload.toolIds,
      });

      const finalContent =
        result.content ||
        assistantContent.trim() ||
        'Maaf, saya belum bisa menghasilkan jawaban untuk pesan itu.';

      await this.databaseService.message.update({
        where: {
          id: assistantMessage.id,
        },
        data: {
          content: finalContent,
        },
      });

      await this.databaseService.conversation.update({
        where: {
          id: conversation.conversation.id,
        },
        data: {
          updatedAt: new Date(),
        },
      });

      this.writeEvent(response, 'done', {
        conversation: conversation.conversation,
        assistantMessageId: assistantMessage.id,
        content: finalContent,
        model: result.model,
      });
      response.end();
    } catch (error) {
      if (assistantMessageId) {
        if (assistantContent.trim()) {
          await this.databaseService.message
            .update({
              where: {
                id: assistantMessageId,
              },
              data: {
                content: assistantContent.trim(),
              },
            })
            .catch(() => null);
        } else {
          await this.databaseService.message
            .delete({
              where: {
                id: assistantMessageId,
              },
            })
            .catch(() => null);
        }
      }

      const message =
        error instanceof Error ? error.message : 'Gagal membuat respons model';
      this.writeEvent(response, 'error', { message });
      response.end();
    }
  }

  private normalizeInput(input: ConversationMutationInput) {
    const content = input.content?.trim() ?? '';
    const toolIds = (Array.isArray(input.toolIds)
      ? input.toolIds
      : typeof input.toolIds === 'string'
        ? [input.toolIds]
        : []
    )
      .map((toolId) => toolId.trim())
      .filter((toolId) => toolId.length > 0);
    const parsedAttachmentCount =
      typeof input.attachmentCount === 'number'
        ? input.attachmentCount
        : typeof input.attachmentCount === 'string'
          ? Number.parseInt(input.attachmentCount, 10)
          : 0;
    const attachmentCount =
      Number.isFinite(parsedAttachmentCount) && parsedAttachmentCount > 0
        ? parsedAttachmentCount
        : 0;

    if (!content && attachmentCount === 0) {
      throw new BadRequestException(
        'Conversation message requires content or attachments',
      );
    }

    if (toolIds.includes('create-image') && !content) {
      throw new BadRequestException(
        'Create image membutuhkan prompt teks dan belum mendukung lampiran tanpa prompt',
      );
    }

    if (toolIds.includes('create-image') && attachmentCount > 0) {
      throw new BadRequestException(
        'Create image belum mendukung lampiran pada alur ini',
      );
    }

    return {
      conversationId: input.conversationId,
      content,
      attachmentCount,
      model: input.model?.trim() || undefined,
      toolIds,
    };
  }

  private buildConversationTitle(content: string, attachmentCount: number) {
    if (content) {
      const normalized = content.replace(/\s+/g, ' ');
      return normalized.length > 48
        ? `${normalized.slice(0, 48).trim()}...`
        : normalized;
    }

    return attachmentCount > 1 ? 'Diskusi lampiran baru' : 'Lampiran baru';
  }

  private async appendUserMessage(
    userId: string,
    conversationId: string,
    input: ConversationMutationInput,
  ) {
    await this.addMessage(userId, conversationId, input);
    return this.getConversation(userId, conversationId);
  }

  private toChatRole(role: MessageRole) {
    if (role === MessageRole.ASSISTANT) {
      return 'assistant' as const;
    }

    if (role === MessageRole.SYSTEM) {
      return 'system' as const;
    }

    return 'user' as const;
  }

  private writeEvent(response: Response, event: string, data: Record<string, unknown>) {
    response.write(`event: ${event}\n`);
    response.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  private combineUserMessageWithAttachmentContext(
    content: string,
    attachmentContext: string,
    storedAttachments: Array<{
      name: string;
      mimeType: string;
      size: number;
      viewUrl: string | null;
    }>,
  ) {
    return [
      content || 'Tolong analisis lampiran yang saya kirim.',
      '',
      'Berikut hasil pembacaan otomatis dari lampiran user.',
      'Instruksi:',
      '- Gunakan isi lampiran ini untuk menjawab pertanyaan user secara langsung dan relevan.',
      '- Jika OCR atau ekstraksi terlihat tidak lengkap, katakan dengan jujur bagian mana yang samar atau mungkin keliru.',
      '- Jika user meminta rangkuman, analisis, atau tanya jawab, prioritaskan isi lampiran di bawah ini.',
      '',
      storedAttachments.length > 0
        ? `File juga telah disimpan permanen di storage internal untuk ${storedAttachments.length} lampiran.`
        : null,
      storedAttachments.length > 0
        ? storedAttachments
            .map((attachment, index) => {
              const sizeInKb = Math.max(1, Math.round(attachment.size / 1024));

              return `Lampiran tersimpan ${index + 1}: ${attachment.name} | ${attachment.mimeType} | ${sizeInKb} KB${attachment.viewUrl ? ` | ${attachment.viewUrl}` : ''}`;
            })
            .join('\n')
        : null,
      storedAttachments.length > 0 ? '' : null,
      '=== HASIL BACA LAMPIRAN ===',
      attachmentContext,
      '=== AKHIR HASIL BACA LAMPIRAN ===',
    ]
      .filter((part): part is string => Boolean(part))
      .join('\n');
  }

  private extractGeneratedImage(
    message: Awaited<ReturnType<DatabaseService['message']['findMany']>>[number] & {
      conversation: {
        id: string;
        title: string;
      };
    },
  ) {
    const imageMatch = message.content.match(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/);

    if (!imageMatch) {
      return null;
    }

    const promptMatch = message.content.match(/\*\*Prompt final:\*\*\s*([\s\S]+)$/);
    const modelMatch = message.content.match(/\*\*Model gambar:\*\*\s*(.+)/);

    return {
      id: message.id,
      conversationId: message.conversation.id,
      conversationTitle: message.conversation.title,
      imageUrl: imageMatch[1],
      prompt: promptMatch?.[1]?.trim() ?? null,
      model: modelMatch?.[1]?.trim() ?? null,
      createdAt: message.createdAt,
    };
  }

  private serializeMessage(
    message: Awaited<ReturnType<DatabaseService['message']['findMany']>>[number],
  ) {
    const attachments = this.parseStoredAttachments(message.attachmentsJson);

    return {
      ...message,
      attachments,
    };
  }

  private parseStoredAttachments(
    attachmentsJson: string | null | undefined,
  ): StoredAttachment[] | undefined {
    if (!attachmentsJson) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(attachmentsJson) as StoredAttachment[];

      if (!Array.isArray(parsed)) {
        return undefined;
      }

      return parsed.filter(
        (attachment) =>
          typeof attachment?.id === 'string' &&
          typeof attachment?.name === 'string' &&
          typeof attachment?.mimeType === 'string' &&
          typeof attachment?.url === 'string',
      );
    } catch {
      return undefined;
    }
  }
}
