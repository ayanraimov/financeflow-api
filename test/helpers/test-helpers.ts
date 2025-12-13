import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Response } from 'supertest';

// Tipos para respuestas de la API
interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}

interface RegisterResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    createdAt: string;
    updatedAt: string;
  };
  accessToken: string;
  refreshToken: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export class TestHelpers {
  constructor(private readonly app: INestApplication) {}

  /**
   * Registra un nuevo usuario
   */
  async registerUser(userData?: {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<{
    user: any;
    tokens: { accessToken: string; refreshToken: string };
    password: string;
    email: string;
  }> {
    const timestamp = Date.now();
    const defaultData = {
      email: `test${timestamp}@example.com`,
      password: 'Test1234!',
      firstName: 'Test',
      lastName: 'User',
    };

    const data = { ...defaultData, ...userData };

    const response: Response = await request(this.app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(data)
      .expect(201);

    const body = response.body as ApiResponse<RegisterResponse>;

    return {
      user: body.data.user,
      tokens: {
        accessToken: body.data.accessToken,
        refreshToken: body.data.refreshToken,
      },
      password: data.password,
      email: data.email,
    };
  }

  /**
   * Login de usuario existente
   */
  async loginUser(
    email: string,
    password: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const response: Response = await request(this.app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    const body = response.body as ApiResponse<LoginResponse>;

    return {
      accessToken: body.data.accessToken,
      refreshToken: body.data.refreshToken,
    };
  }

  /**
   * Crea una cuenta para el usuario autenticado
   */
  async createAccount(
    accessToken: string,
    accountData?: {
      name?: string;
      type?: 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD' | 'CASH' | 'INVESTMENT';
      currency?: string;
      balance?: number;
    },
  ): Promise<any> {
    const timestamp = Date.now();
    const defaultData = {
      name: `Test Account ${timestamp}`,
      type: 'CHECKING' as const,
      currency: 'USD',
      balance: 0,
    };

    const data = { ...defaultData, ...accountData };

    const response: Response = await request(this.app.getHttpServer())
      .post('/api/v1/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(data)
      .expect(201);

    return response.body.data;
  }

  /**
   * Obtiene el balance de una cuenta
   */
  async getAccountBalance(
    accessToken: string,
    accountId: string,
  ): Promise<number> {
    const response: Response = await request(this.app.getHttpServer())
      .get(`/api/v1/accounts/${accountId}/balance`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    return Number(response.body.data.balance);
  }

  /**
   * Crea una transacción
   */
  async createTransaction(
    accessToken: string,
    transactionData: {
      accountId: string;
      amount: number;
      type: 'INCOME' | 'EXPENSE';
      description?: string;
      date?: string;
      categoryId?: string | null;
    },
  ): Promise<any> {
    const timestamp = Date.now();
    const defaultData = {
      description: `Test Transaction ${timestamp}`,
      date: new Date().toISOString(),
      categoryId: null,
    };

    const data = { ...defaultData, ...transactionData };

    const response: Response = await request(this.app.getHttpServer())
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(data)
      .expect(201);

    return response.body.data;
  }

  /**
   * Obtiene todas las transacciones de una cuenta
   */
  async getTransactions(accessToken: string, accountId: string): Promise<any[]> {
    const response: Response = await request(this.app.getHttpServer())
      .get('/api/v1/transactions')
      .query({ accountId })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    return response.body.data;
  }

  /**
   * Elimina una transacción
   */
  async deleteTransaction(
    accessToken: string,
    transactionId: string,
  ): Promise<void> {
    await request(this.app.getHttpServer())
      .delete(`/api/v1/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  }

  /**
   * Actualiza una transacción
   */
  async updateTransaction(
    accessToken: string,
    transactionId: string,
    updateData: {
      amount?: number;
      description?: string;
      date?: string;
      categoryId?: string | null;
    },
  ): Promise<any> {
    const response: Response = await request(this.app.getHttpServer())
      .patch(`/api/v1/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(updateData)
      .expect(200);

    return response.body.data;
  }

  /**
   * Crea un budget
   */
  async createBudget(
    accessToken: string,
    budgetData: {
      categoryId: string;
      amount: number;
      period?: 'WEEKLY' | 'MONTHLY' | 'YEARLY';
      startDate?: string;
      alertThreshold?: number;
    },
  ): Promise<any> {
    const defaultData = {
      period: 'MONTHLY' as const,
      startDate: new Date().toISOString(),
      alertThreshold: 80,
    };

    const data = { ...defaultData, ...budgetData };

    const response: Response = await request(this.app.getHttpServer())
      .post('/api/v1/budgets')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(data)
      .expect(201);

    return response.body.data;
  }

  /**
   * Obtiene el progreso de un budget
   */
  async getBudgetProgress(accessToken: string, budgetId: string): Promise<any> {
    const response: Response = await request(this.app.getHttpServer())
      .get(`/api/v1/budgets/${budgetId}/status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    return response.body.data;
  }

  /**
   * Obtiene una categoría por nombre
   */
  async getCategoryByName(
    accessToken: string,
    name: string,
  ): Promise<any | undefined> {
    const response: Response = await request(this.app.getHttpServer())
      .get('/api/v1/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const categories = response.body.data as any[];
    return categories.find((c) => c.name === name);
  }

  /**
   * Obtiene analytics overview
   */
  async getAnalyticsOverview(
    accessToken: string,
    params?: { period?: string; startDate?: string; endDate?: string },
  ): Promise<any> {
    const query = params || {};
    const response: Response = await request(this.app.getHttpServer())
      .get('/api/v1/analytics/overview')
      .query(query)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    return response.body.data;
  }

  /**
   * Obtiene analytics de spending
   */
  async getAnalyticsSpending(
    accessToken: string,
    params?: { startDate?: string; endDate?: string },
  ): Promise<any> {
    const query = params || {};
    const response: Response = await request(this.app.getHttpServer())
      .get('/api/v1/analytics/spending')
      .query(query)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    return response.body.data;
  }
}
