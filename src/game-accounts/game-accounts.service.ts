import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';

const gameAccountSelect = {
  id: true,
  createdAt: true,
  updatedAt: true,
  game: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
} as const;

@Injectable()
export class GameAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, gameCode: string) {
    const normalizedGameCode = gameCode.trim().toLowerCase();
    const game = await this.prisma.game.findUnique({
      where: {
        code: normalizedGameCode,
      },
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    try {
      return await this.prisma.gameAccount.create({
        data: {
          userId,
          gameId: game.id,
        },
        select: gameAccountSelect,
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'This game is already connected to the user',
        );
      }

      throw error;
    }
  }

  async findAll(userId: string) {
    return this.prisma.gameAccount.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: gameAccountSelect,
    });
  }

  async findOne(userId: string, gameAccountId: string) {
    const gameAccount = await this.prisma.gameAccount.findFirst({
      where: {
        id: gameAccountId,
        userId,
      },
      select: gameAccountSelect,
    });

    if (!gameAccount) {
      throw new NotFoundException('Game account not found');
    }

    return gameAccount;
  }
}
