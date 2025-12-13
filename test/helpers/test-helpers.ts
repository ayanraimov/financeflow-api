import { INestApplication } from '@nestjs/common';
import request from 'supertest';

type AuthResult = {
  accessToken: string;
  refreshToken?: string;
  user: { id: string; email: string };
};

export class TestHelpers {
  constructor(private readonly app: INestApplication) {}

  private http() {
    return request(this.app.getHttpServer());
  }

  // ---- AUTH ----
  async registerAndLogin(): Promise<AuthResult> {
    const email = `e2e_${Date.now()}@test.com`;
    const password = 'Test123!';

    await this.http()
      .post('/api/v1/auth/register')
      .send({ email, password, firstName: 'E2E', lastName: 'User' })
      .expect(201);

    const loginRes = await this.http()
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    const login = loginRes.body?.data ?? loginRes.body;

    if (!login?.accessToken) {
      throw new Error(
        `Login response has no accessToken. Body: ${JSON.stringify(loginRes.body)}`,
      );
    }

    return {
      accessToken: login.accessToken,
      refreshToken: login.refreshToken,
      user: login.user,
    };
  }

  // ---- ACCOUNTS (responde plano) ----
  async createAccount(accessToken: string, payload: any) {
    const res = await this.http()
      .post('/api/v1/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload)
      .expect(201);

    return res.body;
  }

  async getAccount(accessToken: string, accountId: string) {
    const res = await this.http()
      .get(`/api/v1/accounts/${accountId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    return res.body;
  }

  // ---- CATEGORIES ----
  async createCategory(accessToken: string, payload: any) {
    const res = await this.http()
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload)
      .expect(201);

    return res.body?.data ?? res.body;
  }

  // ---- TRANSACTIONS ----
  async createTransaction(accessToken: string, payload: any) {
    const res = await this.http()
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload)
      .expect(201);

    return res.body?.data ?? res.body;
  }

  async listTransactions(
    accessToken: string,
    params: { accountId?: string; page?: number; limit?: number },
  ) {
    const res = await this.http()
      .get('/api/v1/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .query(params)
      .expect(200);

    return res.body?.data ? res.body : res.body;
  }
}
