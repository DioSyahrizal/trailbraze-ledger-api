import { randomUUID } from 'node:crypto';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

import { createE2eApp } from './utils/create-e2e-app';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createE2eApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers a user and logs in successfully', async () => {
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
  });

  it('refreshes using the HttpOnly cookie and rotates the refresh token', async () => {
    const email = `e2e-refresh-${randomUUID()}@test.com`;
    const password = 'pass1234';
    const agent = request.agent(app.getHttpServer());

    await agent.post('/auth/register').send({ email, password }).expect(201);

    const loginResponse = await agent
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    const loginCookieHeader = loginResponse.headers['set-cookie']?.[0];

    if (!loginCookieHeader) {
      throw new Error('Login did not return a refresh cookie');
    }

    const oldRefreshCookie = loginCookieHeader.split(';')[0];

    const refreshResponse = await agent.post('/auth/refresh').expect(201);

    expect(refreshResponse.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        email,
        accessToken: expect.any(String),
      }),
    );
    expect(refreshResponse.body.refreshToken).toBeUndefined();
    expect(refreshResponse.headers['set-cookie']?.[0]).toEqual(
      expect.stringContaining('refresh_token='),
    );

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', oldRefreshCookie)
      .expect(401);
  });

  it('rejects refresh when the cookie is missing', async () => {
    await request(app.getHttpServer()).post('/auth/refresh').expect(401);
  });
});
