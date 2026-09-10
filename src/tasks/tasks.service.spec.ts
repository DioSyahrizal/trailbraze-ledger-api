import { jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { TaskCadence } from '../generated/prisma/enums';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  let service: TasksService;

  type FindGameAccountMock = (args: {
    where: { id: string; userId: string };
    select: { id: true; gameId: true };
  }) => Promise<{ id: string; gameId: string } | null>;

  type FindTaskDefinitionMock = (args: {
    where: {
      id: string;
      gameId: string;
      isActive: true;
      cadence: TaskCadence;
    };
  }) => Promise<{ id: string } | null>;

  type CreateTaskCompletionMock = (args: {
    data: {
      gameAccountId: string;
      periodDate: Date;
      taskDefinitionId: string;
    };
    select: { id: true };
  }) => Promise<{ id: string } | null>;

  type FindTaskDefinitionsMock = (args: {
    where: {
      gameId: string;
      isActive: true;
      cadence: TaskCadence;
    };
    orderBy: { createdAt: 'asc' };
    include: {
      completions: {
        where: { gameAccountId: string; periodDate: Date };
        select: { completedAt: true };
      };
    };
  }) => Promise<
    Array<{
      id: string;
      code: string;
      name: string;
      description: string | null;
      targetValue: number;
      targetUnit: string;
      completions: Array<{ completedAt: Date }>;
    }>
  >;

  const prismaMock = {
    gameAccount: {
      findFirst: jest.fn<FindGameAccountMock>(),
    },
    taskDefinition: {
      findFirst: jest.fn<FindTaskDefinitionMock>(),
      findMany: jest.fn<FindTaskDefinitionsMock>(),
    },
    taskCompletion: {
      create: jest.fn<CreateTaskCompletionMock>(),
    },
  };

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-09T12:00:00.000Z'));
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('throws when the game account is not owned by the user', async () => {
    prismaMock.gameAccount.findFirst.mockResolvedValue(null);

    await expect(
      service.findTodayTasks('user-id', 'game-account-id'),
    ).rejects.toThrow(new NotFoundException('Game account not found'));

    expect(prismaMock.taskDefinition.findMany).not.toHaveBeenCalled();
  });

  it('returns today task definitions with their completion status', async () => {
    const completedAt = new Date('2026-09-09T08:30:00.000Z');

    prismaMock.gameAccount.findFirst.mockResolvedValue({
      id: 'game-account-id',
      gameId: 'game-id',
    });
    prismaMock.taskDefinition.findMany.mockResolvedValue([
      {
        id: 'task-definition-1',
        code: 'daily-commissions',
        name: 'Complete daily commissions',
        description: 'Complete four daily commissions',
        targetValue: 4,
        targetUnit: 'COMMISSIONS',
        completions: [],
      },
      {
        id: 'task-definition-2',
        code: 'daily-login',
        name: 'Log in to the game',
        description: null,
        targetValue: 1,
        targetUnit: 'LOGIN',
        completions: [{ completedAt }],
      },
    ]);

    const result = await service.findTodayTasks('user-id', 'game-account-id');

    expect(prismaMock.gameAccount.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'game-account-id',
        userId: 'user-id',
      },
      select: {
        id: true,
        gameId: true,
      },
    });
    expect(prismaMock.taskDefinition.findMany).toHaveBeenCalledWith({
      where: {
        gameId: 'game-id',
        isActive: true,
        cadence: TaskCadence.DAILY,
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        completions: {
          where: {
            gameAccountId: 'game-account-id',
            periodDate: new Date('2026-09-09T00:00:00.000Z'),
          },
          select: {
            completedAt: true,
          },
        },
      },
    });
    expect(result).toEqual([
      {
        taskDefinitionId: 'task-definition-1',
        code: 'daily-commissions',
        name: 'Complete daily commissions',
        description: 'Complete four daily commissions',
        targetValue: 4,
        targetUnit: 'COMMISSIONS',
        periodDate: '2026-09-09',
        completed: false,
        completedAt: null,
      },
      {
        taskDefinitionId: 'task-definition-2',
        code: 'daily-login',
        name: 'Log in to the game',
        description: null,
        targetValue: 1,
        targetUnit: 'LOGIN',
        periodDate: '2026-09-09',
        completed: true,
        completedAt: '2026-09-09T08:30:00.000Z',
      },
    ]);
  });

  it('completes today task for the owned game account', async () => {
    prismaMock.gameAccount.findFirst.mockResolvedValue({
      id: 'game-account-id',
      gameId: 'game-id',
    });

    prismaMock.taskDefinition.findFirst.mockResolvedValue({
      id: 'task-definition-id',
    });

    const expectedCompletion = {
      id: 'completion-id',
    };

    prismaMock.taskCompletion.create.mockResolvedValue(expectedCompletion);

    const result = await service.completeTodayTask(
      'user-id',
      'game-account-id',
      'task-definition-id',
    );

    expect(prismaMock.taskDefinition.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'task-definition-id',
        gameId: 'game-id',
        isActive: true,
        cadence: TaskCadence.DAILY,
      },
    });

    expect(prismaMock.taskCompletion.create).toHaveBeenCalledWith({
      data: {
        gameAccountId: 'game-account-id',
        periodDate: new Date('2026-09-09T00:00:00.000Z'),
        taskDefinitionId: 'task-definition-id',
      },
      select: {
        id: true,
      },
    });

    expect(result).toEqual(expectedCompletion);
  });

  it('throws ConflictException when the task was already completed today', async () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      {
        code: 'P2002',
        clientVersion: '7.10.0',
        meta: {
          target: ['gameAccountId', 'taskDefinitionId', 'periodDate'],
        },
      },
    );

    prismaMock.gameAccount.findFirst.mockResolvedValue({
      id: 'game-account-id',
      gameId: 'game-id',
    });

    prismaMock.taskDefinition.findFirst.mockResolvedValue({
      id: 'task-definition-id',
    });

    prismaMock.taskCompletion.create.mockRejectedValue(prismaError);

    await expect(
      service.completeTodayTask(
        'user-id',
        'game-account-id',
        'task-definition-id',
      ),
    ).rejects.toThrow(new ConflictException('Task already completed today'));
  });
});
