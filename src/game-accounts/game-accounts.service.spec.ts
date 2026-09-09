import { jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { GameAccountsService } from './game-accounts.service';

describe('GameAccountsService', () => {
  let service: GameAccountsService;

  type GameAccountSummary = {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    game: {
      id: string;
      code: string;
      name: string;
    };
  };

  type FindGameMock = (args: {
    where: { code: string };
  }) => Promise<{ id: string } | null>;

  type CreateGameAccountMock = (args: {
    data: { userId: string; gameId: string };
    select: unknown;
  }) => Promise<GameAccountSummary>;

  type FindManyGameAccountsMock = (args: {
    where: { userId: string };
    orderBy: { createdAt: 'asc' };
    select: unknown;
  }) => Promise<GameAccountSummary[]>;

  type FindOneGameAccountMock = (args: {
    where: { id: string; userId: string };
    select: unknown;
  }) => Promise<GameAccountSummary | null>;

  const prismaMock = {
    game: {
      findUnique: jest.fn<FindGameMock>(),
    },
    gameAccount: {
      create: jest.fn<CreateGameAccountMock>(),
      findMany: jest.fn<FindManyGameAccountsMock>(),
      findFirst: jest.fn<FindOneGameAccountMock>(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameAccountsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<GameAccountsService>(GameAccountsService);
  });

  it('creates a game account for the authenticated user', async () => {
    const expectedAccount: GameAccountSummary = {
      id: 'game-account-id',
      createdAt: new Date('2026-09-09T00:00:00.000Z'),
      updatedAt: new Date('2026-09-09T00:00:00.000Z'),
      game: {
        id: 'game-id',
        code: 'genshin-impact',
        name: 'Genshin Impact',
      },
    };

    prismaMock.game.findUnique.mockResolvedValue({ id: 'game-id' });
    prismaMock.gameAccount.create.mockResolvedValue(expectedAccount);

    const result = await service.create(
      'user-id',
      '  GENSHIN-IMPACT  ',
    );

    expect(prismaMock.game.findUnique).toHaveBeenCalledWith({
      where: { code: 'genshin-impact' },
    });
    expect(prismaMock.gameAccount.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          userId: 'user-id',
          gameId: 'game-id',
        },
      }),
    );
    expect(result).toEqual(expectedAccount);
  });

  it('throws NotFoundException when the game does not exist', async () => {
    prismaMock.game.findUnique.mockResolvedValue(null);

    await expect(
      service.create('user-id', 'unknown-game'),
    ).rejects.toThrow(new NotFoundException('Game not found'));

    expect(prismaMock.gameAccount.create).not.toHaveBeenCalled();
  });

  it('throws ConflictException when the user already has the game', async () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      {
        code: 'P2002',
        clientVersion: '7.10.0',
        meta: { target: ['userId', 'gameId'] },
      },
    );

    prismaMock.game.findUnique.mockResolvedValue({ id: 'game-id' });
    prismaMock.gameAccount.create.mockRejectedValue(prismaError);

    await expect(
      service.create('user-id', 'genshin-impact'),
    ).rejects.toThrow(
      new ConflictException('This game is already connected to the user'),
    );
  });

  it('lists only the authenticated user game accounts', async () => {
    const expectedAccounts: GameAccountSummary[] = [
      {
        id: 'game-account-id',
        createdAt: new Date('2026-09-09T00:00:00.000Z'),
        updatedAt: new Date('2026-09-09T00:00:00.000Z'),
        game: {
          id: 'game-id',
          code: 'genshin-impact',
          name: 'Genshin Impact',
        },
      },
    ];
    prismaMock.gameAccount.findMany.mockResolvedValue(expectedAccounts);

    const result = await service.findAll('user-id');

    expect(prismaMock.gameAccount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-id' },
        orderBy: { createdAt: 'asc' },
      }),
    );
    expect(result).toEqual(expectedAccounts);
  });

  it('finds one game account only when it belongs to the user', async () => {
    const expectedAccount: GameAccountSummary = {
      id: 'game-account-id',
      createdAt: new Date('2026-09-09T00:00:00.000Z'),
      updatedAt: new Date('2026-09-09T00:00:00.000Z'),
      game: {
        id: 'game-id',
        code: 'genshin-impact',
        name: 'Genshin Impact',
      },
    };
    prismaMock.gameAccount.findFirst.mockResolvedValue(expectedAccount);

    const result = await service.findOne('user-id', 'game-account-id');

    expect(prismaMock.gameAccount.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'game-account-id',
          userId: 'user-id',
        },
      }),
    );
    expect(result).toEqual(expectedAccount);
  });

  it('throws NotFoundException when the game account is not owned by the user', async () => {
    prismaMock.gameAccount.findFirst.mockResolvedValue(null);

    await expect(
      service.findOne('user-id', 'other-users-account-id'),
    ).rejects.toThrow(new NotFoundException('Game account not found'));
  });
});
