import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { TaskCadence } from '../../generated/prisma/enums';

const seedGames = [
  {
    code: 'genshin-impact',
    name: 'Genshin Impact',
    tasks: [
      {
        code: 'daily-commissions',
        name: 'Complete daily commissions',
        description: 'Complete the daily commission goal.',
        targetValue: 4,
        targetUnit: 'COMMISSIONS',
      },
    ],
  },
  {
    code: 'wuthering-waves',
    name: 'Wuthering Waves',
    tasks: [
      {
        code: 'daily-activity',
        name: 'Reach daily activity target',
        description: 'Reach the daily activity point goal.',
        targetValue: 100,
        targetUnit: 'ACTIVITY_POINTS',
      },
    ],
  },
  {
    code: 'honkai-star-rail',
    name: 'Honkai: Star Rail',
    tasks: [
      {
        code: 'daily-training',
        name: 'Reach Daily Training target',
        description: 'Reach the daily training point goal.',
        targetValue: 500,
        targetUnit: 'ACTIVITY_POINTS',
      },
    ],
  },
] as const;

@Injectable()
export class SeedService {
  constructor(private readonly prismaService: PrismaService) {}

  async run(): Promise<void> {
    await this.prismaService.$transaction(async (transaction) => {
      for (const gameData of seedGames) {
        const game = await transaction.game.upsert({
          where: {
            code: gameData.code,
          },
          update: {
            name: gameData.name,
          },
          create: {
            code: gameData.code,
            name: gameData.name,
          },
        });

        for (const taskData of gameData.tasks) {
          await transaction.taskDefinition.upsert({
            where: {
              gameId_code: {
                gameId: game.id,
                code: taskData.code,
              },
            },
            update: {
              name: taskData.name,
              description: taskData.description,
              targetValue: taskData.targetValue,
              targetUnit: taskData.targetUnit,
              cadence: TaskCadence.DAILY,
              isActive: true,
            },
            create: {
              gameId: game.id,
              code: taskData.code,
              name: taskData.name,
              description: taskData.description,
              targetValue: taskData.targetValue,
              targetUnit: taskData.targetUnit,
              cadence: TaskCadence.DAILY,
            },
          });
        }
      }
    });
  }
}
