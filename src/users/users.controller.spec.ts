import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestWithUser, UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;

  const usersServiceMock = {
    findById: jest.fn<UsersService['findById']>(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: usersServiceMock,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: jest.fn(),
      })
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should receive the user id', async () => {
    const userId = 'asb-asd-123';

    const expectedUser = {
      id: userId,
      email: 'dio@test.com',
      createdAt: new Date(),
    };

    usersServiceMock.findById.mockResolvedValue(expectedUser);

    const request = {
      user: {
        sub: userId,
      },
    } as RequestWithUser;

    const result = await controller.getMe(request);
    expect(usersServiceMock.findById).toHaveBeenCalledWith(userId);
    expect(result).toEqual(expectedUser);
  });
});
