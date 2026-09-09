import { jest } from '@jest/globals';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
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

  type CreateMock = (args: {
    data: { email: string; passwordHash: string };
  }) => Promise<{
    id: string;
    email: string;
    createdAt: Date;
  }>;

  type SignAsyncMock = (payload: {
    sub: string;
    email: string;
  }) => Promise<string>;

  const prismaMock = {
    user: {
      findUnique: jest.fn<FindUniqueMock>(),
      create: jest.fn<CreateMock>(),
    },
  };

  const jwtServiceMock = {
    signAsync: jest.fn<SignAsyncMock>(),
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
          useValue: jwtServiceMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('registers a user with a normalized email and hashed password', async () => {
    const createdAt = new Date('2026-09-08T00:00:00.000Z');

    prismaMock.user.create.mockResolvedValue({
      id: 'user-id',
      email: 'dio@test.com',
      createdAt,
    });

    const result = await service.register('  DIO@TEST.COM ', 'pass1234');

    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: {
        email: 'dio@test.com',
        passwordHash: expect.any(String),
      },
    });
    expect(prismaMock.user.create.mock.calls[0][0].data.passwordHash).not.toBe(
      'pass1234',
    );
    expect(result).toEqual({
      id: 'user-id',
      email: 'dio@test.com',
      createdAt,
    });
  });

  it('throws ConflictException when the email already exists', async () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      {
        code: 'P2002',
        clientVersion: '7.10.0',
        meta: { target: ['email'] },
      },
    );

    prismaMock.user.create.mockRejectedValue(prismaError);

    await expect(
      service.register('existing@example.com', 'pass1234'),
    ).rejects.toThrow(
      new ConflictException('An account with this email already exists'),
    );
  });

  it('returns a JWT when the credentials are valid', async () => {
    const user = {
      id: 'user-id',
      email: 'existing@example.com',
      passwordHash: 'stored-password-hash',
    };
    const accessToken = 'signed-access-token';

    prismaMock.user.findUnique.mockResolvedValue(user);
    const comparePasswordSpy = jest
      .spyOn(service, 'comparePassword')
      .mockResolvedValue(true);
    jwtServiceMock.signAsync.mockResolvedValue(accessToken);

    const result = await service.login(
      ' EXISTING@EXAMPLE.COM ',
      'correct-password',
    );

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: {
        email: 'existing@example.com',
      },
    });
    expect(comparePasswordSpy).toHaveBeenCalledWith(
      'correct-password',
      'stored-password-hash',
    );
    expect(jwtServiceMock.signAsync).toHaveBeenCalledWith({
      sub: 'user-id',
      email: 'existing@example.com',
    });
    expect(result).toEqual({
      id: 'user-id',
      email: 'existing@example.com',
      accessToken,
    });
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

  it('throws UnauthorizedException when the password is invalid', async () => {
    const comparePasswordSpy = jest
      .spyOn(service, 'comparePassword')
      .mockResolvedValue(false);

    prismaMock.user.findUnique.mockResolvedValue({
      id: 'asb-asd-123',
      email: 'existing@example.com',
      passwordHash: 'stored-password-hash',
    });

    await expect(
      service.login('existing@example.com', 'wrongpassword'),
    ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));

    expect(comparePasswordSpy).toHaveBeenCalledWith(
      'wrongpassword',
      'stored-password-hash',
    );
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: {
        email: 'existing@example.com',
      },
    });
  });
});
