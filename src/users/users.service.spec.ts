import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../database/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  type UserSummary = {
    id: string;
    email: string;
    createdAt: Date;
  };

  type FindUniqueMock = (args: {
    where: { id: string };
    select: { id: true; email: true; createdAt: true };
  }) => Promise<UserSummary | null>;

  const prismaMock = {
    user: {
      findUnique: jest.fn<FindUniqueMock>(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('finds a user by id without selecting the password hash', async () => {
    const expectedUser = {
      id: 'user-id',
      email: 'dio@test.com',
      createdAt: new Date('2026-09-08T00:00:00.000Z'),
    };
    prismaMock.user.findUnique.mockResolvedValue(expectedUser);

    const result = await service.findById('user-id');

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-id' },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });
    expect(result).toEqual(expectedUser);
  });

  it('returns null when the user does not exist', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(service.findById('missing-user-id')).resolves.toBeNull();
  });
});
