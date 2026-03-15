import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService, type AuthenticatedUser } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google/start')
  startGoogleAuth(
    @Query('redirectTo') redirectTo: string | undefined,
    @Res() response: Response,
  ) {
    response.redirect(this.authService.buildGoogleAuthUrl(redirectTo));
  }

  @Get('google/callback')
  async handleGoogleCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Res() response: Response,
  ) {
    if (!code || !state) {
      response.redirect(
        this.authService.buildFrontendCallbackUrl(undefined, {
          error: 'missing_google_callback_params',
        }),
      );
      return;
    }

    const result = await this.authService.signInWithGoogle(code, state);
    response.redirect(
      this.authService.buildFrontendCallbackUrl(result.redirectTo, {
        token: result.token,
      }),
    );
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getCurrentUser(@Req() request: Request & { user?: AuthenticatedUser }) {
    if (!request.user) {
      throw new UnauthorizedException();
    }

    return {
      user: request.user,
    };
  }
}
