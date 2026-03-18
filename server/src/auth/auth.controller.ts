import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService, type AuthenticatedUser } from './auth.service';

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
    response.cookie(
      this.authService.getAuthCookieName(),
      result.token,
      this.authService.buildAuthCookieOptions(),
    );
    response.redirect(this.authService.buildFrontendCallbackUrl(result.redirectTo, {}));
  }

  @Get('me')
  getCurrentUser(@Req() request: Request & { user?: AuthenticatedUser }) {
    const token = this.authService.extractAccessToken(request);

    if (!token) {
      return {
        user: null,
      };
    }

    return this.authService
      .verifyAccessToken(token)
      .then((user) => ({
        user,
      }))
      .catch(() => ({
        user: null,
      }));
  }

  @Post('logout')
  logout(@Res() response: Response) {
    response.clearCookie(
      this.authService.getAuthCookieName(),
      this.authService.buildAuthCookieOptions(),
    );
    response.json({ success: true });
  }
}
