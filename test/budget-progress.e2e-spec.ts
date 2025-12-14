import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/setup-app';
import { TestHelpers } from './helpers/test-helpers';

describe('Budget Progress (e2e)', () => {
  let app: INestApplication;
  let helpers: TestHelpers;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApp(app, true);

    await app.init();
    helpers = new TestHelpers(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should trigger shouldAlert when spending reaches 80% threshold', async () => {
    // 1) Auth + setup
    const { accessToken } = await helpers.registerAndLogin();

    const account = await helpers.createAccount(accessToken, {
      name: 'Test Account',
      type: 'BANK',
      initialBalance: 1000,
      currency: 'EUR',
    });

    // 2) Create EXPENSE category for budget
    const expenseCategory = await helpers.createCategory(accessToken, {
      name: `Groceries-${Date.now()}`,
      type: 'EXPENSE',
      icon: '🛒',
      color: '#FF5733',
    });

    // 3) Create Budget: 400 EUR, alertThreshold 80% (default)
    const budget = await helpers.createBudget(accessToken, {
      categoryId: expenseCategory.id,
      name: 'Monthly Groceries Budget',
      amount: 400,
      period: 'MONTHLY',
      alertThreshold: 80,
    });

    // 4) Initial progress: 0 spent
    let progress = await helpers.getBudgetProgress(accessToken, budget.id);
    expect(progress.spent).toBe(0);
    expect(progress.percentageUsed).toBe(0);
    expect(progress.shouldAlert).toBe(false);
    expect(progress.isOverBudget).toBe(false);

    // 5) Spend 320 EUR (80% of 400) → shouldAlert = true
    await helpers.createTransaction(accessToken, {
      accountId: account.id,
      categoryId: expenseCategory.id,
      type: 'EXPENSE',
      amount: 320,
      description: 'Groceries batch 1',
      date: new Date().toISOString(),
    });

    progress = await helpers.getBudgetProgress(accessToken, budget.id);
    expect(progress.spent).toBe(320);
    expect(progress.percentageUsed).toBe(80);
    expect(progress.shouldAlert).toBe(true); // ✅ Alert triggered
    expect(progress.isOverBudget).toBe(false); // Still under budget

    // 6) Sanity check: remaining should be 80
    expect(progress.remaining).toBe(80);
  });

  it('should trigger isOverBudget when spending exceeds 100%', async () => {
    // 1) Auth + setup
    const { accessToken } = await helpers.registerAndLogin();

    const account = await helpers.createAccount(accessToken, {
      name: 'Test Account',
      type: 'BANK',
      initialBalance: 1000,
      currency: 'EUR',
    });

    const expenseCategory = await helpers.createCategory(accessToken, {
      name: `Entertainment-${Date.now()}`,
      type: 'EXPENSE',
      icon: '🎮',
      color: '#4ECDC4',
    });

    // 2) Create Budget: 400 EUR
    const budget = await helpers.createBudget(accessToken, {
      categoryId: expenseCategory.id,
      name: 'Monthly Entertainment Budget',
      amount: 400,
      period: 'MONTHLY',
    });

    // 3) Spend 420 EUR (105% of 400) → isOverBudget = true
    await helpers.createTransaction(accessToken, {
      accountId: account.id,
      categoryId: expenseCategory.id,
      type: 'EXPENSE',
      amount: 420,
      description: 'Over budget spending',
      date: new Date().toISOString(),
    });

    const progress = await helpers.getBudgetProgress(accessToken, budget.id);

    expect(progress.spent).toBe(420);
    expect(progress.percentageUsed).toBe(105);
    expect(progress.shouldAlert).toBe(true); // Alert also triggered
    expect(progress.isOverBudget).toBe(true); // ✅ Over budget
    expect(progress.remaining).toBe(-20); // Negative remaining
  });

  it('should calculate progress accurately with multiple transactions', async () => {
    const { accessToken } = await helpers.registerAndLogin();

    const account = await helpers.createAccount(accessToken, {
      name: 'Test Account',
      type: 'BANK',
      initialBalance: 2000,
      currency: 'EUR',
    });

    const expenseCategory = await helpers.createCategory(accessToken, {
      name: `Dining-${Date.now()}`,
      type: 'EXPENSE',
      icon: '🍽️',
      color: '#FF5733',
    });

    const budget = await helpers.createBudget(accessToken, {
      categoryId: expenseCategory.id,
      name: 'Dining Budget',
      amount: 500,
      period: 'MONTHLY',
      alertThreshold: 75,
    });

    // Multiple transactions totaling 400 (80%)
    await helpers.createTransaction(accessToken, {
      accountId: account.id,
      categoryId: expenseCategory.id,
      type: 'EXPENSE',
      amount: 150,
      description: 'Restaurant 1',
      date: new Date().toISOString(),
    });

    await helpers.createTransaction(accessToken, {
      accountId: account.id,
      categoryId: expenseCategory.id,
      type: 'EXPENSE',
      amount: 100,
      description: 'Restaurant 2',
      date: new Date().toISOString(),
    });

    await helpers.createTransaction(accessToken, {
      accountId: account.id,
      categoryId: expenseCategory.id,
      type: 'EXPENSE',
      amount: 150,
      description: 'Restaurant 3',
      date: new Date().toISOString(),
    });

    const progress = await helpers.getBudgetProgress(accessToken, budget.id);

    expect(progress.spent).toBe(400);
    expect(progress.percentageUsed).toBe(80);
    expect(progress.remaining).toBe(100);
    expect(progress.shouldAlert).toBe(true); // 80% > 75% threshold
    expect(progress.isOverBudget).toBe(false);
  });
});
