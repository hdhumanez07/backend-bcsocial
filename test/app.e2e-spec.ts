/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter';
import { DataSource } from 'typeorm';

describe('BC Social API (e2e)', () => {
  let app: INestApplication<App>;
  let authToken: string;
  let refreshToken: string;
  let productId: string;
  let onboardingId: string;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: false,
        },
      }),
    );

    app.useGlobalFilters(new HttpExceptionFilter());

    app.enableCors({
      origin: '*',
      credentials: true,
    });

    await app.init();

    dataSource = app.get(DataSource);

    await cleanDatabase(dataSource);
  });

  afterAll(async () => {
    await cleanDatabase(dataSource);
    await app.close();
  });

  async function cleanDatabase(dataSource: DataSource) {
    const entities = dataSource.entityMetadatas;

    for (const entity of entities) {
      const repository = dataSource.getRepository(entity.name);
      await repository.query(
        `TRUNCATE TABLE "${entity.tableName}" RESTART IDENTITY CASCADE;`,
      );
    }
  }
  describe('Health Check', () => {
    it('/health (GET) should return health status', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
          expect(res.body).toHaveProperty('info');
        });
    });
  });

  describe('Authentication', () => {
    const testUser = {
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'Password123',
    };

    it('/auth/register (POST) should register a new user', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user).toHaveProperty('id');
          expect(res.body.user.username).toBe(testUser.username);
        });
    });

    it('/auth/register (POST) should fail with duplicate username', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(409);
    });

    it('/auth/login (POST) should login and return tokens', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: testUser.username,
          password: testUser.password,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body).toHaveProperty('refresh_token');
          expect(res.body.token_type).toBe('Bearer');
          expect(res.body.expires_in).toBe(300);
          authToken = res.body.access_token;
          refreshToken = res.body.refresh_token;
        });
    });

    it('/auth/login (POST) should fail with invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: testUser.username,
          password: 'WrongPassword',
        })
        .expect(401);
    });

    it('/auth/refresh (POST) should refresh access token', async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body).toHaveProperty('refresh_token');
          authToken = res.body.access_token;
          refreshToken = res.body.refresh_token;
        });
    });
  });

  describe('Products', () => {
    const testProduct = {
      name: 'Test Laptop',
      description: 'High-performance laptop for testing',
      price: 999.99,
      stock: 50,
    };

    it('/products (POST) should create a product', () => {
      return request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testProduct)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.name).toBe(testProduct.name);
          expect(parseFloat(res.body.price)).toBe(testProduct.price);
          productId = res.body.id;
        });
    });

    it('/products (POST) should fail without authentication', () => {
      return request(app.getHttpServer())
        .post('/products')
        .send(testProduct)
        .expect(401);
    });

    it('/products (POST) should fail with invalid data', () => {
      return request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test',
          price: -100,
          stock: -5,
        })
        .expect(400);
    });

    it('/products (GET) should return all products', () => {
      return request(app.getHttpServer())
        .get('/products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('/products/:id (GET) should return a product by id', () => {
      return request(app.getHttpServer())
        .get(`/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(productId);
          expect(res.body.name).toBe(testProduct.name);
        });
    });

    it('/products/:id (GET) should fail with invalid UUID', () => {
      return request(app.getHttpServer())
        .get('/products/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('/products/:id (PATCH) should update a product', () => {
      const updateData = { price: 1199.99, stock: 75 };

      return request(app.getHttpServer())
        .patch(`/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200)
        .expect((res) => {
          expect(parseFloat(res.body.price)).toBe(updateData.price);
          expect(res.body.stock).toBe(updateData.stock);
        });
    });

    it('/products/:id (DELETE) should soft delete a product', () => {
      return request(app.getHttpServer())
        .delete(`/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
    });
  });

  describe('Onboarding', () => {
    const testOnboarding = {
      name: 'Jane Smith',
      document: '987654321',
      email: `onboarding_${Date.now()}@example.com`,
      initialAmount: 100000,
    };

    it('/onboarding (POST) should create an onboarding request', () => {
      return request(app.getHttpServer())
        .post('/onboarding')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testOnboarding)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.name).toBe(testOnboarding.name);
          expect(res.body.email).toBe(testOnboarding.email);
          expect(res.body.status).toBe('REQUESTED');
          onboardingId = res.body.id;
        });
    });

    it('/onboarding (POST) should fail without authentication', () => {
      return request(app.getHttpServer())
        .post('/onboarding')
        .send(testOnboarding)
        .expect(401);
    });

    it('/onboarding (POST) should fail with amount below minimum', () => {
      return request(app.getHttpServer())
        .post('/onboarding')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testOnboarding,
          email: `low_${Date.now()}@example.com`,
          initialAmount: 1000,
        })
        .expect(400);
    });

    it('/onboarding (POST) should fail with duplicate email', () => {
      return request(app.getHttpServer())
        .post('/onboarding')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testOnboarding)
        .expect(409);
    });

    it('/onboarding (GET) should return user onboardings', () => {
      return request(app.getHttpServer())
        .get('/onboarding')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('/onboarding/:id (GET) should return an onboarding by id', () => {
      return request(app.getHttpServer())
        .get(`/onboarding/${onboardingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(onboardingId);
          expect(res.body.name).toBe(testOnboarding.name);
        });
    });

    it('/onboarding/:id/status (PATCH) should update status', () => {
      return request(app.getHttpServer())
        .patch(`/onboarding/${onboardingId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'IN_PROGRESS' })
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('IN_PROGRESS');
        });
    });

    it('/onboarding/:id/status (PATCH) should fail with invalid status', () => {
      return request(app.getHttpServer())
        .patch(`/onboarding/${onboardingId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'INVALID_STATUS' })
        .expect(400);
    });

    it('/onboarding/:id (DELETE) should soft delete onboarding', () => {
      return request(app.getHttpServer())
        .delete(`/onboarding/${onboardingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting on login endpoint', async () => {
      const loginData = {
        username: 'testuser',
        password: 'password',
      };

      const requests = Array(4)
        .fill(null)
        .map(() =>
          request(app.getHttpServer()).post('/auth/login').send(loginData),
        );

      const responses = await Promise.all(requests);

      const rateLimited = responses.some((res) => res.status === 429);
      expect(rateLimited).toBe(true);
    });
  });
});
