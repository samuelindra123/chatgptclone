import {
  Body,
  Controller,
  Delete,
  Get,
  UploadedFiles,
  UseInterceptors,
  Patch,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import type { Response } from 'express';
import { type AuthenticatedUser } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ConversationsService } from './conversations.service';

type ConversationRequestBody = {
  conversationId?: string;
  content?: string;
  attachmentCount?: number | string;
  model?: string;
  toolIds?: string | string[];
};

type UpdateConversationBody = {
  title?: string;
};

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  listConversations(@Req() request: Request & { user?: AuthenticatedUser }) {
    return this.conversationsService.listConversations(
      this.getUserIdFromRequest(request),
    );
  }

  @Get('generated-images')
  listGeneratedImages(
    @Req() request: Request & { user?: AuthenticatedUser },
  ) {
    return this.conversationsService.listGeneratedImages(
      this.getUserIdFromRequest(request),
    );
  }

  @Get(':id')
  getConversation(
    @Req() request: Request & { user?: AuthenticatedUser },
    @Param('id') conversationId: string,
  ) {
    return this.conversationsService.getConversation(
      this.getUserIdFromRequest(request),
      conversationId,
    );
  }

  @Post()
  createConversation(
    @Req() request: Request & { user?: AuthenticatedUser },
    @Body() body: ConversationRequestBody,
  ) {
    return this.conversationsService.createConversation(
      this.getUserIdFromRequest(request),
      body,
    );
  }

  @Post(':id/messages')
  addMessage(
    @Req() request: Request & { user?: AuthenticatedUser },
    @Param('id') conversationId: string,
    @Body() body: ConversationRequestBody,
  ) {
    return this.conversationsService.addMessage(
      this.getUserIdFromRequest(request),
      conversationId,
      body,
    );
  }

  @Post('stream')
  @UseInterceptors(
    AnyFilesInterceptor({
      limits: {
        files: 24,
        fileSize: 20 * 1024 * 1024,
      },
    }),
  )
  async streamMessage(
    @Req() request: Request & { user?: AuthenticatedUser },
    @Body() body: ConversationRequestBody,
    @UploadedFiles() files: Express.Multer.File[],
    @Res() response: Response,
  ) {
    await this.conversationsService.streamMessage(
      this.getUserIdFromRequest(request),
      body,
      files ?? [],
      response,
    );
  }

  @Patch(':id')
  renameConversation(
    @Req() request: Request & { user?: AuthenticatedUser },
    @Param('id') conversationId: string,
    @Body() body: UpdateConversationBody,
  ) {
    return this.conversationsService.renameConversation(
      this.getUserIdFromRequest(request),
      conversationId,
      body.title,
    );
  }

  @Delete(':id')
  deleteConversation(
    @Req() request: Request & { user?: AuthenticatedUser },
    @Param('id') conversationId: string,
  ) {
    return this.conversationsService.deleteConversation(
      this.getUserIdFromRequest(request),
      conversationId,
    );
  }

  private getUserIdFromRequest(request: Request & { user?: AuthenticatedUser }) {
    if (!request.user?.id) {
      throw new UnauthorizedException();
    }

    return request.user.id;
  }
}
