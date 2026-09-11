import { randomUUID } from 'node:crypto';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

import { createE2eApp } from './utils/create-e2e-app';

type TestSession = {
  accessToken: string;
};

type TodayTask = {
  taskDefinitionId: string;
  completed: boolean;
  completedAt: string | null;
};

async function createTestSession(
  app: INestApplication<App>,
): Promise<TestSession> {
  const email = `e2e-${randomUUID()}@test.com`;
  const password = 'pass1234';

  const registerResponse = await request(app.getHttpServer())
    .post('/auth/register')
    .send({
      email,
      password,
    })
    .expect(201);

  const loginResponse = await request(app.getHttpServer())
    .post('/auth/login')
    .send({
      email,
      password,
    })
    .expect(201);

  expect(loginResponse.body).toEqual(
    expect.objectContaining({
      id: registerResponse.body.id,
      email,
      accessToken: expect.any(String),
    }),
  );

  return {
    accessToken: loginResponse.body.accessToken as string,
  };
}

async function createGenshinAccount(
  app: INestApplication<App>,
  accessToken: string,
): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/game-accounts')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      gameCode: 'genshin-impact',
    })
    .expect(201);

  return response.body.id as string;
}

async function findIncompleteTask(
  app: INestApplication<App>,
  accessToken: string,
  gameAccountId: string,
): Promise<TodayTask> {
  const response = await request(app.getHttpServer())
    .get(`/game-accounts/${gameAccountId}/tasks/today`)
    .set('Authorization', `Bearer ${accessToken}`)
    .expect(200);

  const tasks = response.body as TodayTask[];
  expect(tasks.length).toBeGreaterThan(0);

  const task = tasks.find((todayTask) => !todayTask.completed);

  if (!task) {
    throw new Error('Expected an incomplete seeded task');
  }

  return task;
}

describe('Tasks (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createE2eApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('completes a task and exposes it in today tasks and history', async () => {
    const session = await createTestSession(app);
    const gameAccountId = await createGenshinAccount(
      app,
      session.accessToken,
    );
    const task = await findIncompleteTask(
      app,
      session.accessToken,
      gameAccountId,
    );

    const completionResponse = await request(app.getHttpServer())
      .post(
        `/game-accounts/${gameAccountId}/tasks/${task.taskDefinitionId}/complete`,
      )
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(201);

    expect(completionResponse.body).toEqual({
      id: expect.any(String),
    });

    const todayResponse = await request(app.getHttpServer())
      .get(`/game-accounts/${gameAccountId}/tasks/today`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(200);

    expect(todayResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          taskDefinitionId: task.taskDefinitionId,
          completed: true,
          completedAt: expect.any(String),
        }),
      ]),
    );

    const historyResponse = await request(app.getHttpServer())
      .get(`/game-accounts/${gameAccountId}/tasks/history`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(200);

    expect(historyResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: completionResponse.body.id,
          gameAccountId,
          gameName: 'Genshin Impact',
          taskDefinitionId: task.taskDefinitionId,
          periodDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          completedAt: expect.any(String),
        }),
      ]),
    );
  });

  it('rejects completing the same task twice', async () => {
    const session = await createTestSession(app);
    const gameAccountId = await createGenshinAccount(
      app,
      session.accessToken,
    );
    const task = await findIncompleteTask(
      app,
      session.accessToken,
      gameAccountId,
    );
    const taskPath = `/game-accounts/${gameAccountId}/tasks/${task.taskDefinitionId}/complete`;

    await request(app.getHttpServer())
      .post(taskPath)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .post(taskPath)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(409)
      .expect(({ body }) => {
        expect(body.message).toBe('Task already completed today');
      });
  });

  it('prevents another user from accessing the game account tasks and history', async () => {
    const ownerSession = await createTestSession(app);
    const otherSession = await createTestSession(app);
    const gameAccountId = await createGenshinAccount(
      app,
      ownerSession.accessToken,
    );

    await request(app.getHttpServer())
      .get(`/game-accounts/${gameAccountId}/tasks/today`)
      .set('Authorization', `Bearer ${otherSession.accessToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .get(`/game-accounts/${gameAccountId}/tasks/history`)
      .set('Authorization', `Bearer ${otherSession.accessToken}`)
      .expect(404);
  });

  it('rejects task requests without an access token', async () => {
    await request(app.getHttpServer())
      .get(`/game-accounts/${randomUUID()}/tasks/today`)
      .expect(401);
  });
});
