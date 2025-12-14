import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/setup-app';
import { TestHelpers } from './helpers/test-helpers';

describe('Analytics Accuracy (e2e)', () => {
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

  it('should calculate totalIncome, totalExpenses, netSavings, and savingsRate accurately', async () => {
    // 1) Auth + setup
    const { accessToken } = await helpers.registerAndLogin();

    const account = await helpers.createAccount(accessToken, {
      name: 'Test Account',
      type: 'BANK',
      initialBalance: 1000,
      currency: 'EUR',
    });

    // 2) Create INCOME category
    const incomeCategory = await helpers.createCategory(accessToken, {
      name: `Salary-${Date.now()}`,
      type: 'INCOME',
      icon: '💰',
      color: '#4CAF50',
    });

    // 3) Create EXPENSE category
    const expenseCategory = await helpers.createCategory(accessToken, {
      name: `Groceries-${Date.now()}`,
      type: 'EXPENSE',
      icon: '🛒',
      color: '#FF5733',
    });

    // 4) Create INCOME transactions: 600 EUR total
    await helpers.createTransaction(accessToken, {
      accountId: account.id,
      categoryId: incomeCategory.id,
      type: 'INCOME',
      amount: 400,
      description: 'Monthly salary',
      date: new Date().toISOString(),
    });

    await helpers.createTransaction(accessToken, {
      accountId: account.id,
      categoryId: incomeCategory.id,
      type: 'INCOME',
      amount: 200,
      description: 'Freelance work',
      date: new Date().toISOString(),
    });

    // 5) Create EXPENSE transactions: 400 EUR total
    await helpers.createTransaction(accessToken, {
      accountId: account.id,
      categoryId: expenseCategory.id,
      type: 'EXPENSE',
      amount: 250,
      description: 'Groceries batch 1',
      date: new Date().toISOString(),
    });

    await helpers.createTransaction(accessToken, {
      accountId: account.id,
      categoryId: expenseCategory.id,
      type: 'EXPENSE',
      amount: 150,
      description: 'Groceries batch 2',
      date: new Date().toISOString(),
    });

    // 6) Get analytics overview for current month
    const analytics = await helpers.getAnalyticsOverview(
      accessToken,
      'MONTH',
    );

    // 7) Validate aggregations
    expect(analytics.totalIncome).toBe(600);
    expect(analytics.totalExpenses).toBe(400);
    expect(analytics.netSavings).toBe(200); // 600 - 400
    expect(analytics.savingsRate).toBe(33.33); // (200 / 600) * 100

    // 8) Validate transaction count
    expect(analytics.transactionCount).toBe(4);
  });

  it('should handle zero income correctly (savingsRate = 0)', async () => {
    const { accessToken } = await helpers.registerAndLogin();

    const account = await helpers.createAccount(accessToken, {
      name: 'Test Account',
      type: 'BANK',
      initialBalance: 500,
      currency: 'EUR',
    });

    const expenseCategory = await helpers.createCategory(accessToken, {
      name: `Shopping-${Date.now()}`,
      type: 'EXPENSE',
      icon: '🛍️',
      color: '#E91E63',
    });

    // Only expenses, no income
    await helpers.createTransaction(accessToken, {
      accountId: account.id,
      categoryId: expenseCategory.id,
      type: 'EXPENSE',
      amount: 100,
      description: 'Shopping',
      date: new Date().toISOString(),
    });

    const analytics = await helpers.getAnalyticsOverview(
      accessToken,
      'MONTH',
    );

    expect(analytics.totalIncome).toBe(0);
    expect(analytics.totalExpenses).toBe(100);
    expect(analytics.netSavings).toBe(-100); // Negative savings
    expect(analytics.savingsRate).toBe(0); // Division by zero protection
  });

  it('should calculate avgDailyExpense correctly', async () => {
    const { accessToken } = await helpers.registerAndLogin();

    const account = await helpers.createAccount(accessToken, {
      name: 'Test Account',
      type: 'BANK',
      initialBalance: 2000,
      currency: 'EUR',
    });

    const expenseCategory = await helpers.createCategory(accessToken, {
      name: `Daily-${Date.now()}`,
      type: 'EXPENSE',
      icon: '📅',
      color: '#9C27B0',
    });

    // Create 300 EUR in expenses
    await helpers.createTransaction(accessToken, {
      accountId: account.id,
      categoryId: expenseCategory.id,
      type: 'EXPENSE',
      amount: 300,
      description: 'Test expense',
      date: new Date().toISOString(),
    });

    const analytics = await helpers.getAnalyticsOverview(
      accessToken,
      'MONTH',
    );

    // avgDailyExpense = totalExpenses / days in period
    // For current month, days varies, so just validate it's calculated
    expect(analytics.avgDailyExpense).toBeGreaterThan(0);
    expect(analytics.totalExpenses).toBe(300);
  });

  it('should validate topCategories ranking by amount', async () => {
    const { accessToken } = await helpers.registerAndLogin();

    const account = await helpers.createAccount(accessToken, {
      name: 'Test Account',
      type: 'BANK',
      initialBalance: 3000,
      currency: 'EUR',
    });

    // Create 3 expense categories
    const cat1 = await helpers.createCategory(accessToken, {
      name: `Category1-${Date.now()}`,
      type: 'EXPENSE',
      icon: '1️⃣',
      color: '#FF0000',
    });

    const cat2 = await helpers.createCategory(accessToken, {
      name: `Category2-${Date.now()}`,
      type: 'EXPENSE',
      icon: '2️⃣',
      color: '#00FF00',
    });

    const cat3 = await helpers.createCategory(accessToken, {
      name: `Category3-${Date.now()}`,
      type: 'EXPENSE',
      icon: '3️⃣',
      color: '#0000FF',
    });

    // Create transactions with different amounts
    await helpers.createTransaction(accessToken, {
      accountId: account.id,
      categoryId: cat1.id,
      type: 'EXPENSE',
      amount: 500, // Highest
      description: 'Cat1 expense',
      date: new Date().toISOString(),
    });

    await helpers.createTransaction(accessToken, {
      accountId: account.id,
      categoryId: cat2.id,
      type: 'EXPENSE',
      amount: 300, // Middle
      description: 'Cat2 expense',
      date: new Date().toISOString(),
    });

    await helpers.createTransaction(accessToken, {
      accountId: account.id,
      categoryId: cat3.id,
      type: 'EXPENSE',
      amount: 100, // Lowest
      description: 'Cat3 expense',
      date: new Date().toISOString(),
    });

    const analytics = await helpers.getAnalyticsOverview(
      accessToken,
      'MONTH',
    );

    // Validate top categories are sorted by amount (descending)
    expect(analytics.topCategories).toHaveLength(3);
    expect(analytics.topCategories[0].amount).toBe(500);
    expect(analytics.topCategories[1].amount).toBe(300);
    expect(analytics.topCategories[2].amount).toBe(100);

    // Validate percentages
    expect(analytics.topCategories[0].percentage).toBeCloseTo(55.56, 1); // 500/900
    expect(analytics.topCategories[1].percentage).toBeCloseTo(33.33, 1); // 300/900
    expect(analytics.topCategories[2].percentage).toBeCloseTo(11.11, 1); // 100/900
  });
});
