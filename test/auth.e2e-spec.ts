import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { TestHelpers } from './helpers/test-helpers';
import { setupApp } from '../src/setup-app';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let helpers: TestHelpers;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // ⭐ Aplicar configuración compartida (modo test)
    setupApp(app, true); // true = es test

    await app.init();
    helpers = new TestHelpers(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('should register new user with valid data', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(userData);

      console.log('STATUS', response.status);
      console.log('BODY', response.body);

      expect(response.status).toBe(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');

      const user = response.body.data.user;
      expect(user.email).toBe(userData.email);
      expect(user.firstName).toBe(userData.firstName);
      expect(user.lastName).toBe(userData.lastName);
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('firstName');
      expect(user).toHaveProperty('lastName');
      expect(user).not.toHaveProperty('password');

      expect(typeof response.body.data.accessToken).toBe('string');
      expect(response.body.data.accessToken.split('.').length).toBe(3);
      expect(typeof response.body.data.refreshToken).toBe('string');
      expect(response.body.data.refreshToken.split('.').length).toBe(3);
    });

    it('should reject duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User',
      };

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
    });

    it('should reject weak password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'weakpass@example.com',
          password: '123',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'not-an-email',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login with correct credentials', async () => {
      const { email, password } = await helpers.registerUser();

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
    });

    it('should reject incorrect password', async () => {
      const { email } = await helpers.registerUser();

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'WrongPassword123!' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject non-existent email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePassword123!',
        })
        .expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh tokens with valid refreshToken (rotation + invalidation)', async () => {
      const { tokens } = await helpers.registerUser();

      // 1) Refresh OK con el token original
      const res1 = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: tokens.refreshToken })
        .expect(200);

      expect(res1.body.success).toBe(true);
      expect(res1.body.data).toHaveProperty('accessToken');
      expect(res1.body.data).toHaveProperty('refreshToken');

      const newRefreshToken = res1.body.data.refreshToken;

      expect(newRefreshToken).not.toBe(tokens.refreshToken);

      // 2) Reusar el refresh token anterior debe fallar (invalidación)
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: tokens.refreshToken })
        .expect(401);

      // 3) El refresh token nuevo sí debe funcionar
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: newRefreshToken })
        .expect(200);
    });

    it('should reject invalid refreshToken', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid.jwt.token' })
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout with valid accessToken', async () => {
      const { tokens } = await helpers.registerUser();

      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: tokens.refreshToken })
        .expect(401);
    });

    it('should reject logout without token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .expect(401);
    });
  });
});
