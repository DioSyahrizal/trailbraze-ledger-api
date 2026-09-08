import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private jwtService: JwtService,
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

    const payload = {
      sub: user.id,
      email: user.email,
    };

    const token = await this.jwtService.signAsync(payload);

    return {
      id: user.id,
      email: user.email,
      accessToken: token,
    };
  }

  async getUserByAccessToken(accessToken: string) {
    const payload = await this.jwtService.verifyAsync(accessToken);
    return this.prisma.user.findUnique({
      where: {
        id: payload.sub,
      },
    });
  }
}
