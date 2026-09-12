import { jest } from '@jest/globals';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { RedisService } from '../redis/redis.service';
import { AuthService } from './auth.service';
import type {
  AccessTokenPayload,
  RefreshTokenPayload,
} from './guards/jwt-auth.guard';

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

  type SignAsyncMock = (
    payload: AccessTokenPayload | RefreshTokenPayload,
    options: { expiresIn: string },
  ) => Promise<string>;

  const prismaMock = {
    user: {
      findUnique: jest.fn<FindUniqueMock>(),
      create: jest.fn<CreateMock>(),
    },
  };

  const jwtServiceMock = {
    signAsync: jest.fn<SignAsyncMock>(),
    verifyAsync:
      jest.fn<
        (token: string) => Promise<AccessTokenPayload | RefreshTokenPayload>
      >(),
  };

  const transactionMock = {
    del: jest.fn(() => transactionMock),
    set: jest.fn(() => transactionMock),
    exec: jest.fn(async () => []),
  };

  const redisClientMock = {
    set: jest.fn(),
    get: jest.fn<() => Promise<string | null>>(),
    multi: jest.fn(() => transactionMock),
    del: jest.fn<(key: string) => Promise<number>>(),
  };

  const redisServiceMock = {
    getClient: jest.fn(() => redisClientMock),
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
        {
          provide: RedisService,
          useValue: redisServiceMock,
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
    const refreshToken = 'signed-refresh-token';

    prismaMock.user.findUnique.mockResolvedValue(user);
    const comparePasswordSpy = jest
      .spyOn(service, 'comparePassword')
      .mockResolvedValue(true);
    jwtServiceMock.signAsync
      .mockResolvedValueOnce(accessToken)
      .mockResolvedValueOnce(refreshToken);

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
    expect(jwtServiceMock.signAsync).toHaveBeenNthCalledWith(
      1,
      {
        sub: 'user-id',
        email: 'existing@example.com',
        tokenType: 'access',
      },
      { expiresIn: '15m' },
    );
    expect(jwtServiceMock.signAsync).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        sub: 'user-id',
        email: 'existing@example.com',
        tokenType: 'refresh',
        jti: expect.any(String),
      }),
      { expiresIn: '7d' },
    );
    expect(result).toEqual({
      id: 'user-id',
      email: 'existing@example.com',
      accessToken,
      refreshToken,
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

  it('rotates a valid refresh token', async () => {
    const oldRefreshToken = 'old-refresh-token';
    const newAccessToken = 'new-access-token';
    const newRefreshToken = 'new-refresh-token';
    const user = {
      id: 'user-id',
      email: 'existing@example.com',
      passwordHash: 'stored-password-hash',
    };
    redisClientMock.get.mockResolvedValue(JSON.stringify({ userId: user.id }));
    prismaMock.user.findUnique.mockResolvedValue(user);
    jwtServiceMock.verifyAsync.mockResolvedValue({
      sub: user.id,
      email: user.email,
      tokenType: 'refresh',
      jti: 'refresh-jti',
    });
    jwtServiceMock.signAsync
      .mockResolvedValueOnce(newAccessToken)
      .mockResolvedValueOnce(newRefreshToken);

    const result = await service.refreshToken(oldRefreshToken);

    expect(jwtServiceMock.verifyAsync).toHaveBeenCalledWith(oldRefreshToken);
    expect(redisClientMock.get).toHaveBeenCalledWith(
      expect.stringMatching(/^auth:session:[0-9a-f]{64}$/),
    );
    expect(transactionMock.del).toHaveBeenCalledWith(
      expect.stringMatching(/^auth:session:[0-9a-f]{64}$/),
    );
    expect(transactionMock.set).toHaveBeenCalledWith(
      expect.stringMatching(/^auth:session:[0-9a-f]{64}$/),
      JSON.stringify({ userId: user.id }),
      {
        expiration: {
          type: 'EX',
          value: 60 * 60 * 24 * 7,
        },
      },
    );
    expect(transactionMock.exec).toHaveBeenCalled();
    expect(result).toEqual({
      id: user.id,
      email: user.email,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  });

  it('rejects a refresh token that is not a refresh JWT', async () => {
    jwtServiceMock.verifyAsync.mockResolvedValue({
      sub: 'user-id',
      email: 'existing@example.com',
      tokenType: 'access',
    });

    await expect(service.refreshToken('access-token')).rejects.toThrow(
      new UnauthorizedException('Invalid refresh token'),
    );

    expect(redisClientMock.get).not.toHaveBeenCalled();
  });

  it('clears the refresh token from the redis cache', async () => {
    const refreshToken = 'refresh-token';
    redisClientMock.del.mockResolvedValue(1);

    await service.logout(refreshToken);

    expect(redisClientMock.del).toHaveBeenCalledWith(
      'auth:session:0eb17643d4e9261163783a420859c92c7d212fa9624106a12b510afbec266120',
    );
  });
});
