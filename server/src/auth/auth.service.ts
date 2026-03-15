import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { DatabaseService } from '../database/database.service';

type GoogleStatePayload = {
  type: 'google-oauth-state';
  redirectTo: string;
};

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  buildGoogleAuthUrl(redirectTo?: string) {
    const client = this.createGoogleOAuthClient();
    const frontendUrl =
      redirectTo ||
      this.configService.get<string>('FRONTEND_URL') ||
      'http://localhost:3000';
    const state = this.jwtService.sign(
      {
        type: 'google-oauth-state',
        redirectTo: frontendUrl,
      } satisfies GoogleStatePayload,
      {
        secret: this.getJwtSecret(),
        expiresIn: '10m',
      },
    );

    return client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['openid', 'email', 'profile'],
      state,
    });
  }

  buildFrontendCallbackUrl(
    frontendBase: string | undefined,
    params: { token?: string; error?: string },
  ) {
    const base =
      frontendBase ||
      this.configService.get<string>('FRONTEND_URL') ||
      'http://localhost:3000';
    const url = new URL('/auth/callback', base);

    if (params.token) {
      url.searchParams.set('token', params.token);
    }

    if (params.error) {
      url.searchParams.set('error', params.error);
    }

    return url.toString();
  }

  async signInWithGoogle(code: string, state: string) {
    const googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID');

    if (!googleClientId) {
      throw new InternalServerErrorException(
        'GOOGLE_CLIENT_ID is not configured',
      );
    }

    const verifiedState = this.verifyGoogleState(state);

    const client = this.createGoogleOAuthClient();
    const { tokens } = await client.getToken(code);

    if (!tokens.id_token) {
      throw new UnauthorizedException('Google did not return an ID token');
    }

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: googleClientId,
    });
    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email) {
      throw new UnauthorizedException('Unable to read Google profile');
    }

    const user = await this.databaseService.user.upsert({
      where: {
        googleId: payload.sub,
      },
      update: {
        email: payload.email,
        name: payload.name ?? null,
        avatarUrl: payload.picture ?? null,
      },
      create: {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name ?? null,
        avatarUrl: payload.picture ?? null,
      },
    });

    return {
      token: await this.createAccessToken({
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      }),
      redirectTo: verifiedState.redirectTo,
    };
  }

  async verifyAccessToken(token: string) {
    try {
      return await this.jwtService.verifyAsync<AuthenticatedUser>(token, {
        secret: this.getJwtSecret(),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private verifyGoogleState(state: string) {
    try {
      const payload = this.jwtService.verify<GoogleStatePayload>(state, {
        secret: this.getJwtSecret(),
      });

      if (payload.type !== 'google-oauth-state') {
        throw new UnauthorizedException('Invalid OAuth state');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Invalid OAuth state');
    }
  }

  private async createAccessToken(user: AuthenticatedUser) {
    return this.jwtService.signAsync(user, {
      secret: this.getJwtSecret(),
      expiresIn: '7d',
    });
  }

  private createGoogleOAuthClient() {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret =
      this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackUrl =
      this.configService.get<string>('GOOGLE_CALLBACK_URL') ||
      'http://localhost:3001/api/auth/google/callback';

    if (!clientId || !clientSecret) {
      throw new BadRequestException(
        'Google OAuth credentials are not configured',
      );
    }

    return new OAuth2Client(clientId, clientSecret, callbackUrl);
  }

  private getJwtSecret() {
    return (
      this.configService.get<string>('JWT_SECRET') || 'change-this-in-production'
    );
  }
}
