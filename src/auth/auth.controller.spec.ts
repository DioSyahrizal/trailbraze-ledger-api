import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  const authServiceMock = {
    login: jest.fn<AuthService['login']>(),
    register: jest.fn<AuthService['register']>(),
  };

  beforeEach(async () => {
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
    const expectedResponse = {
      id: 'user-id',
      email: 'dio@test.com',
      accessToken: 'access-token',
    };
    authServiceMock.login.mockResolvedValue(expectedResponse);

    const result = await controller.login({
      email: 'dio@test.com',
      password: 'pass1234',
    });

    expect(authServiceMock.login).toHaveBeenCalledWith(
      'dio@test.com',
      'pass1234',
    );
    expect(result).toEqual(expectedResponse);
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
});
