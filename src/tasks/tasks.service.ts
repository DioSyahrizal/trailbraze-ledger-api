import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  formatUtcPeriodDate,
  getUtcPeriodDate,
} from '../common/date/utc-dates';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { TaskCadence } from '../generated/prisma/enums';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async findTodayTasks(userId: string, gameAccountId: string) {
    const periodDate = getUtcPeriodDate();

    const gameAccount = await this.prisma.gameAccount.findFirst({
      where: {
        id: gameAccountId,
        userId,
      },
      select: {
        id: true,
        gameId: true,
      },
    });

    if (!gameAccount) {
      throw new NotFoundException('Game account not found');
    }

    const taskDefinitions = await this.prisma.taskDefinition.findMany({
      where: {
        gameId: gameAccount.gameId,
        isActive: true,
        cadence: TaskCadence.DAILY,
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        completions: {
          where: {
            gameAccountId: gameAccount.id,
            periodDate,
          },
          select: {
            completedAt: true,
          },
        },
      },
    });

    return taskDefinitions.map((taskDefinition) => ({
      taskDefinitionId: taskDefinition.id,
      code: taskDefinition.code,
      name: taskDefinition.name,
      description: taskDefinition.description,
      targetValue: taskDefinition.targetValue,
      targetUnit: taskDefinition.targetUnit,
      periodDate: formatUtcPeriodDate(periodDate),
      completed: taskDefinition.completions.length > 0,
      completedAt:
        taskDefinition.completions.at(-1)?.completedAt.toISOString() ?? null,
    }));
  }

  async completeTodayTask(
    userId: string,
    gameAccountId: string,
    taskId: string,
  ) {
    const periodDate = getUtcPeriodDate();

    const gameAccount = await this.prisma.gameAccount.findFirst({
      where: {
        id: gameAccountId,
        userId,
      },
      select: {
        id: true,
        gameId: true,
      },
    });

    if (!gameAccount) {
      throw new NotFoundException('Game account not found');
    }

    const taskDefinition = await this.prisma.taskDefinition.findFirst({
      where: {
        id: taskId,
        gameId: gameAccount.gameId,
        isActive: true,
        cadence: TaskCadence.DAILY,
      },
    });

    if (!taskDefinition) {
      throw new NotFoundException('Task definition not found');
    }

    try {
      const taskCompletion = await this.prisma.taskCompletion.create({
        data: {
          gameAccountId: gameAccount.id,
          periodDate,
          taskDefinitionId: taskDefinition.id,
        },
        select: {
          id: true,
        },
      });
      return taskCompletion;
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Task already completed today');
      } else {
        throw error;
      }
    }
  }
}
