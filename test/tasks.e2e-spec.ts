import { randomUUID } from 'node:crypto';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

import { PrismaService } from '../src/database/prisma.service';
import { createE2eApp } from './utils/create-e2e-app';

type TestSession = {
  accessCookie: string;
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
    }),
  );

  const accessCookieHeader = (
    loginResponse.headers['set-cookie'] as unknown as string[] | undefined
  )?.find((cookie) => cookie.startsWith('access_token='));
  if (!accessCookieHeader) {
    throw new Error('Login did not return an access-token cookie');
  }

  return {
    accessCookie: accessCookieHeader.split(';')[0],
  };
}

async function createGenshinAccount(
  app: INestApplication<App>,
  accessCookie: string,
): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/game-accounts')
    .set('Cookie', accessCookie)
    .send({
      gameCode: 'genshin-impact',
    })
    .expect(201);

  return response.body.id as string;
}

async function findIncompleteTask(
  app: INestApplication<App>,
  accessCookie: string,
  gameAccountId: string,
): Promise<TodayTask> {
  const response = await request(app.getHttpServer())
    .get(`/game-accounts/${gameAccountId}/tasks/today`)
    .set('Cookie', accessCookie)
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
    const gameAccountId = await createGenshinAccount(app, session.accessCookie);
    const task = await findIncompleteTask(
      app,
      session.accessCookie,
      gameAccountId,
    );

    const completionResponse = await request(app.getHttpServer())
      .post(
        `/game-accounts/${gameAccountId}/tasks/${task.taskDefinitionId}/complete`,
      )
      .set('Cookie', session.accessCookie)
      .expect(201);

    expect(completionResponse.body).toEqual({
      id: expect.any(String),
    });

    const todayResponse = await request(app.getHttpServer())
      .get(`/game-accounts/${gameAccountId}/tasks/today`)
      .set('Cookie', session.accessCookie)
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
      .set('Cookie', session.accessCookie)
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
    const gameAccountId = await createGenshinAccount(app, session.accessCookie);
    const task = await findIncompleteTask(
      app,
      session.accessCookie,
      gameAccountId,
    );
    const taskPath = `/game-accounts/${gameAccountId}/tasks/${task.taskDefinitionId}/complete`;

    await request(app.getHttpServer())
      .post(taskPath)
      .set('Cookie', session.accessCookie)
      .expect(201);

    await request(app.getHttpServer())
      .post(taskPath)
      .set('Cookie', session.accessCookie)
      .expect(409)
      .expect(({ body }) => {
        expect(body.message).toBe('Task already completed today');
      });
  });

  it('stores only one completion when duplicate requests arrive concurrently', async () => {
    const session = await createTestSession(app);
    const gameAccountId = await createGenshinAccount(app, session.accessCookie);
    const task = await findIncompleteTask(
      app,
      session.accessCookie,
      gameAccountId,
    );
    const taskPath = `/game-accounts/${gameAccountId}/tasks/${task.taskDefinitionId}/complete`;

    const responses = await Promise.all([
      request(app.getHttpServer())
        .post(taskPath)
        .set('Cookie', session.accessCookie),
      request(app.getHttpServer())
        .post(taskPath)
        .set('Cookie', session.accessCookie),
    ]);

    expect(
      responses.map((response) => response.status).sort((a, b) => a - b),
    ).toEqual([201, 409]);

    const conflictResponse = responses.find(
      (response) => response.status === 409,
    );
    expect(conflictResponse?.body.message).toBe('Task already completed today');

    const prisma = app.get(PrismaService);
    const completionCount = await prisma.taskCompletion.count({
      where: {
        gameAccountId,
        taskDefinitionId: task.taskDefinitionId,
      },
    });

    expect(completionCount).toBe(1);
  });

  it('prevents another user from accessing the game account tasks and history', async () => {
    const ownerSession = await createTestSession(app);
    const otherSession = await createTestSession(app);
    const gameAccountId = await createGenshinAccount(
      app,
      ownerSession.accessCookie,
    );

    await request(app.getHttpServer())
      .get(`/game-accounts/${gameAccountId}/tasks/today`)
      .set('Cookie', otherSession.accessCookie)
      .expect(404);

    await request(app.getHttpServer())
      .get(`/game-accounts/${gameAccountId}/tasks/history`)
      .set('Cookie', otherSession.accessCookie)
      .expect(404);
  });

  it('rejects task requests without an access token', async () => {
    await request(app.getHttpServer())
      .get(`/game-accounts/${randomUUID()}/tasks/today`)
      .expect(401);
  });
});
