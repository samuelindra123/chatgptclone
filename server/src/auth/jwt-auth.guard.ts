import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request & { user?: unknown }>();
    const token = this.authService.extractAccessToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing session token');
    }

    request.user = await this.authService.verifyAccessToken(token);
    return true;
  }
}
