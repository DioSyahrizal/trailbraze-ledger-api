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
});
