import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthenticatedUser } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TheologyService } from './theology.service';

type TheologyChatBody = {
  sessionId?: string;
  content?: string;
  model?: string;
  deepAcademicMode?: boolean;
};

@Controller('teologis-ai')
@UseGuards(JwtAuthGuard)
export class TheologyController {
  constructor(private readonly theologyService: TheologyService) {}

  @Get('sessions')
  listSessions(@Req() request: Request & { user?: AuthenticatedUser }) {
    return this.theologyService.listSessions(this.getUserIdFromRequest(request));
  }

  @Get('sessions/:id')
  getSession(
    @Req() request: Request & { user?: AuthenticatedUser },
    @Param('id') sessionId: string,
  ) {
    return this.theologyService.getSession(this.getUserIdFromRequest(request), sessionId);
  }

  @Patch('sessions/:id')
  renameSession(
    @Req() request: Request & { user?: AuthenticatedUser },
    @Param('id') sessionId: string,
    @Body('title') title: string,
  ) {
    return this.theologyService.renameSession(
      this.getUserIdFromRequest(request),
      sessionId,
      title,
    );
  }

  @Delete('sessions/:id')
  deleteSession(
    @Req() request: Request & { user?: AuthenticatedUser },
    @Param('id') sessionId: string,
  ) {
    return this.theologyService.deleteSession(this.getUserIdFromRequest(request), sessionId);
  }

  @Post('chat')
  async chat(
    @Req() request: Request & { user?: AuthenticatedUser },
    @Body() body: TheologyChatBody,
    @Res() response: Response,
  ) {
    await this.theologyService.streamChat(
      this.getUserIdFromRequest(request),
      body,
      response,
    );
  }

  private getUserIdFromRequest(request: Request & { user?: AuthenticatedUser }) {
    if (!request.user?.id) {
      throw new UnauthorizedException();
    }

    return request.user.id;
  }
}
