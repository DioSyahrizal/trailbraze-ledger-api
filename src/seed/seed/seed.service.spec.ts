import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../database/prisma.service';
import { SeedService } from './seed.service';

describe('SeedService', () => {
  let service: SeedService;

  const transaction = {
    game: {
      upsert: jest.fn(),
    },
    taskDefinition: {
      upsert: jest.fn(),
    },
  };
  const prisma = {
    $transaction: jest.fn(async (callback: any) => callback(transaction)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SeedService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<SeedService>(SeedService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
