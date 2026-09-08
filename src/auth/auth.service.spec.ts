import { jest } from '@jest/globals';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../database/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  type FindOneMock = {
    id: string;
    email: string;
    passwordHash: string;
  };

  type FindUniqueMock = (args: {
    where: { email: string };
  }) => Promise<FindOneMock | null>;

  const prismaMock = {
    user: {
      findUnique: jest.fn<FindUniqueMock>(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('throws UnauthorizedException when the user does not exist', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login('missing@example.com', 'password123'),
    ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: {
        email: 'missing@example.com',
      },
    });
  });

  it('throws ConflictException when the password is invalid', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'asb-asd-123',
      email: 'existing@example.com',
      passwordHash:
        '$argon2id$v=19$m=65536,t=2,p=1$c29tZXNhbHQ$RdYcE3+f/6/7/9/8/7/6/5/4/3/2/1/0',
    });

    await expect(
      service.login('existing@example.com', 'wrongpassword'),
    ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: {
        email: 'existing@example.com',
      },
    });
  });
});
