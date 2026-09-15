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

    const agent = request.agent(app.getHttpServer());
    const registerResponse = await agent
      .post('/auth/register')
      .send({
        email,
        password,
      })
      .expect(201);

    const loginResponse = await agent
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
    expect(loginResponse.body.accessToken).toBeUndefined();
    expect(loginResponse.body.refreshToken).toBeUndefined();
    const loginCookies = loginResponse.headers[
      'set-cookie'
    ] as unknown as string[];
    const accessCookie = loginCookies.find((cookie) =>
      cookie.startsWith('access_token='),
    );
    const refreshCookie = loginCookies.find((cookie) =>
      cookie.startsWith('refresh_token='),
    );
    expect(accessCookie).toContain('HttpOnly');
    expect(accessCookie).toContain('Path=/');
    expect(refreshCookie).toContain('HttpOnly');
    expect(refreshCookie).toContain('Path=/auth');

    await agent
      .get('/users/me')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            id: registerResponse.body.id,
            email,
          }),
        );
      });
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

    const loginCookieHeader = (
      loginResponse.headers['set-cookie'] as unknown as string[] | undefined
    )?.find((cookie) => cookie.startsWith('refresh_token='));

    if (!loginCookieHeader) {
      throw new Error('Login did not return a refresh cookie');
    }

    const oldRefreshCookie = loginCookieHeader.split(';')[0];

    const refreshResponse = await agent.post('/auth/refresh').expect(201);

    expect(refreshResponse.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        email,
      }),
    );
    expect(refreshResponse.body.accessToken).toBeUndefined();
    expect(refreshResponse.body.refreshToken).toBeUndefined();
    expect(refreshResponse.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringContaining('access_token='),
        expect.stringContaining('refresh_token='),
      ]),
    );

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', oldRefreshCookie)
      .expect(401);
  });

  it('rejects refresh when the cookie is missing', async () => {
    await request(app.getHttpServer()).post('/auth/refresh').expect(401);
  });

  it('logs out and clears both cookies', async () => {
    const email = `e2e-logout-${randomUUID()}@test.com`;
    const password = 'pass1234';
    const agent = request.agent(app.getHttpServer());

    await agent.post('/auth/register').send({ email, password }).expect(201);
    await agent.post('/auth/login').send({ email, password }).expect(201);

    const logoutResponse = await agent.post('/auth/logout').expect(204);

    const clearedCookies = logoutResponse.headers[
      'set-cookie'
    ] as unknown as string[];
    const clearedAccessCookie = clearedCookies.find((cookie) =>
      cookie.startsWith('access_token='),
    );
    const clearedRefreshCookie = clearedCookies.find((cookie) =>
      cookie.startsWith('refresh_token='),
    );
    expect(clearedAccessCookie).toContain('Path=/');
    expect(clearedAccessCookie).toContain('Expires=Thu, 01 Jan 1970');
    expect(clearedRefreshCookie).toContain('Path=/auth');
    expect(clearedRefreshCookie).toContain('Expires=Thu, 01 Jan 1970');

    await agent.post('/auth/refresh').expect(401);
  });
});
