import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';

import type { AccessTokenPayload } from '../auth/guards/jwt-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

describe('TasksController', () => {
  let controller: TasksController;

  const tasksServiceMock = {
    findTodayTasks: jest.fn<TasksService['findTodayTasks']>(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        {
          provide: TasksService,
          useValue: tasksServiceMock,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn() })
      .compile();

    controller = module.get<TasksController>(TasksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('passes the authenticated user ID and game account ID to the service', async () => {
    const user: AccessTokenPayload = {
      sub: 'user-id',
      email: 'dio@test.com',
      tokenType: 'access',
    };
    const expectedResponse: Awaited<
      ReturnType<TasksService['findTodayTasks']>
    > = [];
    tasksServiceMock.findTodayTasks.mockResolvedValue(expectedResponse);

    const result = await controller.findTodayTasks(user, 'game-account-id');

    expect(tasksServiceMock.findTodayTasks).toHaveBeenCalledWith(
      'user-id',
      'game-account-id',
    );
    expect(result).toEqual(expectedResponse);
  });
});
