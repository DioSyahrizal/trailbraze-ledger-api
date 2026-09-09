import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import { TaskCadence } from '../generated/prisma/enums';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async findTodayTasks(userId: string, gameAccountId: string) {
    const now = new Date();

    const periodDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );

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
      periodDate: periodDate.toISOString().slice(0, 10),
      completed: taskDefinition.completions.length > 0,
      completedAt:
        taskDefinition.completions.at(-1)?.completedAt.toISOString() ?? null,
    }));
  }
}
