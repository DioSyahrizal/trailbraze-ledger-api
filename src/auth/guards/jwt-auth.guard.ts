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
  iat?: number;
  exp?: number;
};

type AuthenticatedRequest = Request & {
  user: AccessTokenPayload;
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
      request.user =
        await this.jwtService.verifyAsync<AccessTokenPayload>(token);
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or missing access token');
    }
  }

  private extractToken(request: Request): string | undefined {
    const authorization = request.headers.authorization?.trim();
    const match = /^Bearer\s+(\S+)$/i.exec(authorization ?? '');

    return match?.[1];
  }
}
