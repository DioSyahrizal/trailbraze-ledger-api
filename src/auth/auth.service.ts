import { createHash, randomUUID } from 'node:crypto';

import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { RedisService } from '../redis/redis.service';
import type {
  AccessTokenPayload,
  RefreshTokenPayload,
} from './guards/jwt-auth.guard';

const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

type AuthSession = {
  userId: string;
};

function isAuthSession(value: unknown): value is AuthSession {
  return (
    typeof value === 'object' &&
    value !== null &&
    'userId' in value &&
    typeof value.userId === 'string'
  );
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  async findUserByEmail(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });
    if (!user) {
      throw new ConflictException('User not found');
    }
    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
    };
  }

  async comparePassword(password: string, passwordHash: string) {
    return argon2.verify(passwordHash, password);
  }

  async register(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();

    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
    });

    try {
      const user = await this.prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
        },
      });
      return {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      };
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'An account with this email already exists',
        );
      } else {
        throw error;
      }
    }
  }

  async login(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await this.comparePassword(
      password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      tokenType: 'access',
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '15m',
    });

    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      email: user.email,
      tokenType: 'refresh',
      jti: randomUUID(),
    };

    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      expiresIn: '7d',
    });

    const hashedRefreshToken = createHash('sha256')
      .update(refreshToken, 'utf-8')
      .digest('hex');

    const redisKey = `auth:session:${hashedRefreshToken}`;

    await this.redisService
      .getClient()
      .set(redisKey, JSON.stringify({ userId: user.id }), {
        expiration: {
          type: 'EX',
          value: REFRESH_TOKEN_TTL_SECONDS,
        },
      });

    return {
      id: user.id,
      email: user.email,
      accessToken,
      refreshToken,
    };
  }

  async getUserByAccessToken(accessToken: string) {
    const payload =
      await this.jwtService.verifyAsync<AccessTokenPayload>(accessToken);

    if (payload.tokenType !== 'access') {
      throw new UnauthorizedException('Invalid access token');
    }

    return this.prisma.user.findUnique({
      where: {
        id: payload.sub,
      },
    });
  }

  async refreshToken(refreshToken: string) {
    let refreshPayload: RefreshTokenPayload;

    try {
      refreshPayload =
        await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (refreshPayload.tokenType !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const hashedRefreshToken = createHash('sha256')
      .update(refreshToken, 'utf-8')
      .digest('hex');

    const redisKey = `auth:session:${hashedRefreshToken}`;

    const session = await this.redisService.getClient().get(redisKey);

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    let sessionData: unknown;

    try {
      sessionData = JSON.parse(session);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (
      !isAuthSession(sessionData) ||
      sessionData.userId !== refreshPayload.sub
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: sessionData.userId,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      tokenType: 'access',
    };

    const accessToken = await this.jwtService.signAsync(accessPayload, {
      expiresIn: '15m',
    });

    const newRefreshPayload: RefreshTokenPayload = {
      sub: user.id,
      email: user.email,
      tokenType: 'refresh',
      jti: randomUUID(),
    };

    const newRefreshToken = await this.jwtService.signAsync(newRefreshPayload, {
      expiresIn: '7d',
    });

    const newHashedRefreshToken = createHash('sha256')
      .update(newRefreshToken, 'utf-8')
      .digest('hex');
    const newRedisKey = `auth:session:${newHashedRefreshToken}`;

    await this.redisService
      .getClient()
      .multi()
      .del(redisKey)
      .set(newRedisKey, JSON.stringify({ userId: user.id }), {
        expiration: {
          type: 'EX',
          value: REFRESH_TOKEN_TTL_SECONDS,
        },
      })
      .exec();

    return {
      id: user.id,
      email: user.email,
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    const hashedRefreshToken = createHash('sha256')
      .update(refreshToken, 'utf-8')
      .digest('hex');

    const redisKey = `auth:session:${hashedRefreshToken}`;

    await this.redisService.getClient().del(redisKey);
  }
}
