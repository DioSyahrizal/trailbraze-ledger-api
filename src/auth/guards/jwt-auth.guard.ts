import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

export type AccessTokenPayload = {
  sub: string;
  email: string;
  tokenType: 'access';
  iat?: number;
  exp?: number;
};

export type RefreshTokenPayload = {
  sub: string;
  email: string;
  tokenType: 'refresh';
  jti: string;
  iat?: number;
  exp?: number;
};

type AuthenticatedRequest = Request & {
  user: AccessTokenPayload;
};

type TokenRequest = Request & {
  cookies?: Record<string, unknown>;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Invalid or missing access token');
    }

    try {
      const payload =
        await this.jwtService.verifyAsync<AccessTokenPayload>(token);

      if (payload.tokenType !== 'access') {
        throw new UnauthorizedException('Invalid access token');
      }

      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or missing access token');
    }
  }

  private extractToken(request: Request): string | undefined {
    const authorization = request.headers.authorization?.trim();
    const match = /^Bearer\s+(\S+)$/i.exec(authorization ?? '');

    if (match?.[1]) {
      return match[1];
    }

    const accessTokenCookie = (request as TokenRequest).cookies?.[
      'access_token'
    ];
    return typeof accessTokenCookie === 'string'
      ? accessTokenCookie
      : undefined;
  }
}
