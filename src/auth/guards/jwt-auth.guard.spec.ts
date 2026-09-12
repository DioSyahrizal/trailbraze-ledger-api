import { jest } from '@jest/globals';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request } from 'express';

import {
  type AccessTokenPayload,
  JwtAuthGuard,
  type RefreshTokenPayload,
} from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  const jwtServiceMock = {
    verifyAsync:
      jest.fn<() => Promise<AccessTokenPayload | RefreshTokenPayload>>(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
  });

  function createContext(authorization?: string) {
    const request = {
      headers: { authorization },
    } as Request & { user?: AccessTokenPayload };

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    return { context, request };
  }

  it('rejects requests without a bearer token', async () => {
    const { context } = createContext();

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(jwtServiceMock.verifyAsync).not.toHaveBeenCalled();
  });

  it('rejects requests with an invalid token', async () => {
    jwtServiceMock.verifyAsync.mockRejectedValue(new Error('Invalid token'));
    const { context } = createContext('Bearer invalid-token');

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('attaches the verified payload to the request', async () => {
    const payload: AccessTokenPayload = {
      sub: 'user-id',
      email: 'user@example.com',
      tokenType: 'access',
    };
    jwtServiceMock.verifyAsync.mockResolvedValue(payload);
    const { context, request } = createContext('Bearer valid-token');

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(jwtServiceMock.verifyAsync).toHaveBeenCalledWith('valid-token');
    expect(request.user).toEqual(payload);
  });

  it('rejects a refresh token as an access token', async () => {
    jwtServiceMock.verifyAsync.mockResolvedValue({
      sub: 'user-id',
      email: 'user@example.com',
      tokenType: 'refresh',
      jti: 'refresh-jti',
    });
    const { context } = createContext('Bearer refresh-token');

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
