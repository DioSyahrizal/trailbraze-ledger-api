import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';

import type { AccessTokenPayload } from '../auth/guards/jwt-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GameAccountsController } from './game-accounts.controller';
import { GameAccountsService } from './game-accounts.service';

describe('GameAccountsController', () => {
  let controller: GameAccountsController;

  const gameAccountsServiceMock = {
    create: jest.fn<GameAccountsService['create']>(),
    findAll: jest.fn<GameAccountsService['findAll']>(),
    findOne: jest.fn<GameAccountsService['findOne']>(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GameAccountsController],
      providers: [
        {
          provide: GameAccountsService,
          useValue: gameAccountsServiceMock,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn() })
      .compile();

    controller = module.get<GameAccountsController>(GameAccountsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('passes the authenticated user ID and game code to the service', async () => {
    const user: AccessTokenPayload = {
      sub: 'user-id',
      email: 'dio@test.com',
    };
    const expectedResponse = {
      id: 'game-account-id',
      createdAt: new Date('2026-09-09T00:00:00.000Z'),
      updatedAt: new Date('2026-09-09T00:00:00.000Z'),
      game: {
        id: 'game-id',
        code: 'genshin-impact',
        name: 'Genshin Impact',
      },
    };
    gameAccountsServiceMock.create.mockResolvedValue(expectedResponse);

    const result = await controller.create(user, {
      gameCode: 'genshin-impact',
    });

    expect(gameAccountsServiceMock.create).toHaveBeenCalledWith(
      'user-id',
      'genshin-impact',
    );
    expect(result).toEqual(expectedResponse);
  });

  it('passes the authenticated user ID when listing accounts', async () => {
    const user: AccessTokenPayload = {
      sub: 'user-id',
      email: 'dio@test.com',
    };
    const expectedResponse: Awaited<
      ReturnType<GameAccountsService['findAll']>
    > = [];
    gameAccountsServiceMock.findAll.mockResolvedValue(expectedResponse);

    const result = await controller.findAll(user);

    expect(gameAccountsServiceMock.findAll).toHaveBeenCalledWith('user-id');
    expect(result).toEqual(expectedResponse);
  });

  it('passes the authenticated user ID and account ID when finding one account', async () => {
    const user: AccessTokenPayload = {
      sub: 'user-id',
      email: 'dio@test.com',
    };
    const expectedResponse = {
      id: 'game-account-id',
      createdAt: new Date('2026-09-09T00:00:00.000Z'),
      updatedAt: new Date('2026-09-09T00:00:00.000Z'),
      game: {
        id: 'game-id',
        code: 'genshin-impact',
        name: 'Genshin Impact',
      },
    };
    gameAccountsServiceMock.findOne.mockResolvedValue(expectedResponse);

    const result = await controller.findOne(user, 'game-account-id');

    expect(gameAccountsServiceMock.findOne).toHaveBeenCalledWith(
      'user-id',
      'game-account-id',
    );
    expect(result).toEqual(expectedResponse);
  });
});
