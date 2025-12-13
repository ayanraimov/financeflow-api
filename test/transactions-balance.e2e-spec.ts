import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/setup-app';
import { TestHelpers } from './helpers/test-helpers';
import { PrismaService } from '../src/infrastructure/database/prisma.service';

describe('Transactions Balance Integrity (e2e)', () => {
  let app: INestApplication;
  let helpers: TestHelpers;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    setupApp(app, true); // true = test mode (como en Auth e2e)
    await app.init();

    helpers = new TestHelpers(app);
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  const money = (v: any) => {
    // balance/amount puede venir como string o number
    const n = typeof v === 'number' ? v : parseFloat(String(v));
    return Number(n.toFixed(2));
  };

  const assertBalanceMatchesAggregates = async (accountId: string) => {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { balance: true },
    });

    const [incAgg, expAgg] = await Promise.all([
      prisma.transaction.aggregate({
        where: { accountId, type: 'INCOME' },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { accountId, type: 'EXPENSE' },
        _sum: { amount: true },
      }),
    ]);

    const inc = incAgg._sum.amount ? money(incAgg._sum.amount) : 0;
    const exp = expAgg._sum.amount ? money(expAgg._sum.amount) : 0;

    expect(money(account?.balance)).toBe(money(inc - exp));
  };

  it('should keep account.balance === SUM(INCOME) - SUM(EXPENSE)', async () => {
    // 1) Auth
    const { accessToken } = await helpers.registerAndLogin();

    // 2) Setup domain data (vía API)
    const account = await helpers.createAccount(accessToken, {
      name: 'Test Account',
      type: 'BANK',
      initialBalance: 0,
      currency: 'EUR',
    });

    const incomeCat = await helpers.createCategory(accessToken, {
      name: 'Salary',
      type: 'INCOME',
      icon: '💰',
      color: '#4ECDC4',
    });

    const expenseCat = await helpers.createCategory(accessToken, {
      name: 'Groceries',
      type: 'EXPENSE',
      icon: '🛒',
      color: '#FF5733',
    });

    // 3) Balance inicial
    const a0 = await helpers.getAccount(accessToken, account.id);
    expect(money(a0.balance)).toBe(0);

    // 4) INCOME 500 -> 500
    await helpers.createTransaction(accessToken, {
      accountId: account.id,
      categoryId: incomeCat.id,
      type: 'INCOME',
      amount: 500,
      description: 'Salary',
      date: new Date(Date.now() - 60_000).toISOString(),
    });

    const a1 = await helpers.getAccount(accessToken, account.id);
    expect(money(a1.balance)).toBe(500);
    await assertBalanceMatchesAggregates(account.id);

    // 5) EXPENSE 200 -> 300
    await helpers.createTransaction(accessToken, {
      accountId: account.id,
      categoryId: expenseCat.id,
      type: 'EXPENSE',
      amount: 200,
      description: 'Groceries',
      date: new Date(Date.now() - 30_000).toISOString(),
    });

    const a2 = await helpers.getAccount(accessToken, account.id);
    expect(money(a2.balance)).toBe(300);
    await assertBalanceMatchesAggregates(account.id);
  });
});
