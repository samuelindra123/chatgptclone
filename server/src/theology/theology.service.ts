import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConversationNamespace, MessageRole } from '@prisma/client';
import type { Response } from 'express';
import { DatabaseService } from '../database/database.service';
import { LlmService } from '../llm/llm.service';
import { TheologyPromptOrchestratorService } from './theology-prompt-orchestrator.service';

type TheologyChatInput = {
  sessionId?: string;
  content?: string;
  model?: string;
  deepAcademicMode?: boolean;
};

@Injectable()
export class TheologyService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly llmService: LlmService,
    private readonly theologyPromptOrchestratorService: TheologyPromptOrchestratorService,
  ) {}

  async listSessions(userId: string) {
    const sessions = await this.databaseService.conversation.findMany({
      where: {
        userId,
        namespace: ConversationNamespace.THEOLOGY,
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
      sessions: sessions.map((session) => ({
        id: session.id,
        title: session.title,
        updatedAt: session.updatedAt,
        preview: session.messages[0]?.content ?? '',
      })),
    };
  }

  async getSession(userId: string, sessionId: string) {
    const session = await this.databaseService.conversation.findFirst({
      where: {
        id: sessionId,
        userId,
        namespace: ConversationNamespace.THEOLOGY,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Theology session not found');
    }

    return {
      session: {
        id: session.id,
        title: session.title,
        updatedAt: session.updatedAt,
        createdAt: session.createdAt,
      },
      messages: session.messages,
    };
  }

  async renameSession(userId: string, sessionId: string, title: string) {
    const session = await this.databaseService.conversation.findFirst({
      where: {
        id: sessionId,
        userId,
        namespace: ConversationNamespace.THEOLOGY,
      },
    });

    if (!session) {
      throw new NotFoundException('Theology session not found');
    }

    const updated = await this.databaseService.conversation.update({
      where: {
        id: sessionId,
      },
      data: {
        title,
      },
    });

    return {
      session: {
        id: updated.id,
        title: updated.title,
        updatedAt: updated.updatedAt,
      },
    };
  }

  async deleteSession(userId: string, sessionId: string) {
    const session = await this.databaseService.conversation.findFirst({
      where: {
        id: sessionId,
        userId,
        namespace: ConversationNamespace.THEOLOGY,
      },
    });

    if (!session) {
      throw new NotFoundException('Theology session not found');
    }

    await this.databaseService.conversation.delete({
      where: {
        id: sessionId,
      },
    });

    return { success: true };
  }

  async streamChat(userId: string, input: TheologyChatInput, response: Response) {
    const payload = this.normalizeInput(input);
    let assistantMessageId: string | null = null;
    let assistantContent = '';

    response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.flushHeaders();

    try {
      const session = payload.sessionId
        ? await this.appendUserMessage(userId, payload.sessionId, payload)
        : await this.createSession(userId, payload);
      const userMessage = session.messages.at(-1);

      if (!userMessage) {
        throw new InternalServerErrorException('Failed to create theology user message');
      }

      const assistantMessage = await this.databaseService.message.create({
        data: {
          conversationId: session.session.id,
          role: MessageRole.ASSISTANT,
          content: '',
          attachmentCount: 0,
        },
      });

      assistantMessageId = assistantMessage.id;

      this.writeEvent(response, 'meta', {
        session: session.session,
        userMessageId: userMessage.id,
        assistantMessageId: assistantMessage.id,
        model: payload.model || 'xynoos-ai-v1',
      });

      const messageHistory = session.messages
        .filter((message) => message.role !== MessageRole.SYSTEM || message.content)
        .map((message) => ({
          role: this.toChatRole(message.role),
          content: message.content,
        }));

      const orchestration = this.theologyPromptOrchestratorService.buildPromptContext({
        deepAcademicMode: payload.deepAcademicMode,
      });

      const result = await this.llmService.streamChatCompletion({
        model: payload.model,
        messages: messageHistory,
        profile: 'theology_profile',
        additionalSystemMessages: orchestration.additionalSystemMessages,
        onDelta: (delta) => {
          assistantContent += delta;
          this.writeEvent(response, 'delta', { text: delta });
        },
        onToolStatus: (tool) => {
          this.writeEvent(response, 'tool', tool);
        },
      });

      const finalContent =
        result.content ||
        assistantContent.trim() ||
        'Maaf, saya belum bisa menghasilkan jawaban teologis untuk pesan itu.';

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
          id: session.session.id,
        },
        data: {
          updatedAt: new Date(),
        },
      });

      this.writeEvent(response, 'done', {
        session: session.session,
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
        error instanceof Error ? error.message : 'Gagal membuat respons Teologis AI';
      this.writeEvent(response, 'error', { message });
      response.end();
    }
  }

  private normalizeInput(input: TheologyChatInput) {
    const content = input.content?.trim() ?? '';

    if (!content) {
      throw new BadRequestException('Teologis AI membutuhkan pertanyaan yang tidak kosong');
    }

    return {
      sessionId: input.sessionId,
      content,
      model: input.model?.trim() || undefined,
      deepAcademicMode: Boolean(input.deepAcademicMode),
    };
  }

  private async createSession(userId: string, input: ReturnType<TheologyService['normalizeInput']>) {
    const title = this.buildSessionTitle(input.content);

    const conversation = await this.databaseService.conversation.create({
      data: {
        userId,
        title,
        namespace: ConversationNamespace.THEOLOGY,
        messages: {
          create: {
            role: MessageRole.USER,
            content: input.content,
            attachmentCount: 0,
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
      session: {
        id: conversation.id,
        title: conversation.title,
        updatedAt: conversation.updatedAt,
        createdAt: conversation.createdAt,
      },
      messages: conversation.messages,
    };
  }

  private async appendUserMessage(
    userId: string,
    sessionId: string,
    input: ReturnType<TheologyService['normalizeInput']>,
  ) {
    const session = await this.databaseService.conversation.findFirst({
      where: {
        id: sessionId,
        userId,
        namespace: ConversationNamespace.THEOLOGY,
      },
    });

    if (!session) {
      throw new NotFoundException('Theology session not found');
    }

    await this.databaseService.message.create({
      data: {
        conversationId: sessionId,
        role: MessageRole.USER,
        content: input.content,
        attachmentCount: 0,
      },
    });

    const updatedSession = await this.databaseService.conversation.update({
      where: {
        id: sessionId,
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
      session: {
        id: updatedSession.id,
        title: updatedSession.title,
        updatedAt: updatedSession.updatedAt,
        createdAt: updatedSession.createdAt,
      },
      messages: updatedSession.messages,
    };
  }

  private buildSessionTitle(content: string) {
    const normalized = content.replace(/\s+/g, ' ');
    return normalized.length > 56 ? `${normalized.slice(0, 56).trim()}...` : normalized;
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
}
