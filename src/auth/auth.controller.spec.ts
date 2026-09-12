import { jest } from '@jest/globals';
import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request, Response } from 'express';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  const authServiceMock = {
    login: jest.fn<AuthService['login']>(),
    register: jest.fn<AuthService['register']>(),
    refreshToken: jest.fn<AuthService['refreshToken']>(),
  };

  function createResponseMock() {
    return {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    } as unknown as Response;
  }

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authServiceMock,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates login credentials to AuthService', async () => {
    const serviceResponse = {
      id: 'user-id',
      email: 'dio@test.com',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    };
    authServiceMock.login.mockResolvedValue(serviceResponse);
    const response = createResponseMock();

    const result = await controller.login(
      {
        email: 'dio@test.com',
        password: 'pass1234',
      },
      response,
    );

    expect(authServiceMock.login).toHaveBeenCalledWith(
      'dio@test.com',
      'pass1234',
    );
    expect(result).toEqual({
      id: 'user-id',
      email: 'dio@test.com',
      accessToken: 'access-token',
    });
    expect(response.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'refresh-token',
      expect.objectContaining({
        httpOnly: true,
        path: '/auth',
      }),
    );
  });

  it('delegates registration credentials to AuthService', async () => {
    const expectedResponse = {
      id: 'user-id',
      email: 'dio@test.com',
      createdAt: new Date('2026-09-08T00:00:00.000Z'),
    };
    authServiceMock.register.mockResolvedValue(expectedResponse);

    const result = await controller.register({
      email: 'dio@test.com',
      password: 'pass1234',
    });

    expect(authServiceMock.register).toHaveBeenCalledWith(
      'dio@test.com',
      'pass1234',
    );
    expect(result).toEqual(expectedResponse);
  });

  it('refreshes the token from the refresh cookie', async () => {
    const serviceResponse = {
      id: 'user-id',
      email: 'dio@test.com',
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    };
    authServiceMock.refreshToken.mockResolvedValue(serviceResponse);
    const response = createResponseMock();
    const request = {
      cookies: {
        refresh_token: 'old-refresh-token',
      },
    } as unknown as Request;

    const result = await controller.refreshToken(request, response);

    expect(authServiceMock.refreshToken).toHaveBeenCalledWith(
      'old-refresh-token',
    );
    expect(response.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'new-refresh-token',
      expect.objectContaining({
        httpOnly: true,
        path: '/auth',
      }),
    );
    expect(result).toEqual({
      id: 'user-id',
      email: 'dio@test.com',
      accessToken: 'new-access-token',
    });
  });

  it('rejects refresh when the cookie is missing', async () => {
    const response = createResponseMock();
    const request = { cookies: {} } as unknown as Request;

    await expect(controller.refreshToken(request, response)).rejects.toThrow(
      new UnauthorizedException('Missing refresh token'),
    );
    expect(authServiceMock.refreshToken).not.toHaveBeenCalled();
  });
});
