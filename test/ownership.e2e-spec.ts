import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/setup-app';
import { TestHelpers } from './helpers/test-helpers';

describe('Ownership Validation (e2e)', () => {
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

  it('should prevent User B from accessing User A resources', async () => {
    // 1) User A: register/login
    const userA = await helpers.registerAndLogin();

    // 2) User A: create Account
    const accountA = await helpers.createAccount(userA.accessToken, {
      name: 'User A Account',
      type: 'BANK',
      initialBalance: 1000,
      currency: 'EUR',
      color: '#FF5733',
      icon: '💰',
    });

    // 3) User A: create Category + Transaction
    const categoryA = await helpers.createCategory(userA.accessToken, {
      name: 'User A Salary',
      type: 'INCOME',
      icon: '💼',
      color: '#4ECDC4',
    });

    const transactionA = await helpers.createTransaction(userA.accessToken, {
      accountId: accountA.id,
      categoryId: categoryA.id,
      type: 'INCOME',
      amount: 500,
      description: 'User A Income',
      date: new Date().toISOString(),
    });

    // 4) Verify User A CAN access their own resources (200)
    await helpers.getAccount(userA.accessToken, accountA.id); // expect 200
    await helpers.getTransaction(userA.accessToken, transactionA.id); // expect 200

    // 5) User B: register/login (different user)
    const userB = await helpers.registerAndLogin();

    // 6) User B tries to GET User A's Account → 403
    await helpers.expectForbidden(() =>
      helpers.getAccountRaw(userB.accessToken, accountA.id),
    );

    // 7) User B tries to GET User A's Transaction → 403
    await helpers.expectForbidden(() =>
      helpers.getTransactionRaw(userB.accessToken, transactionA.id),
    );

    // 8) User B tries to UPDATE User A's Account → 403
    await helpers.expectForbidden(() =>
      helpers.updateAccountRaw(userB.accessToken, accountA.id, { name: 'Hacked' }),
    );

    // 9) User B tries to DELETE User A's Transaction → 403
    await helpers.expectForbidden(() =>
      helpers.deleteTransactionRaw(userB.accessToken, transactionA.id),
    );
  });

  it('should allow users to access only their own resources', async () => {
    // User A
    const userA = await helpers.registerAndLogin();
    const accountA = await helpers.createAccount(userA.accessToken, {
      name: 'User A Safe Account',
      type: 'CASH',
      initialBalance: 500,
      currency: 'USD',
    });

    // User B
    const userB = await helpers.registerAndLogin();
    const accountB = await helpers.createAccount(userB.accessToken, {
      name: 'User B Safe Account',
      type: 'BANK',
      initialBalance: 200,
      currency: 'EUR',
    });

    // User A can access own account
    const gotA = await helpers.getAccount(userA.accessToken, accountA.id);
    expect(gotA.id).toBe(accountA.id);
    expect(gotA.userId).toBe(userA.user.id);

    // User B can access own account
    const gotB = await helpers.getAccount(userB.accessToken, accountB.id);
    expect(gotB.id).toBe(accountB.id);
    expect(gotB.userId).toBe(userB.user.id);

    // Cross-access forbidden (use RAW helpers)
    await helpers.expectForbidden(() =>
      helpers.getAccountRaw(userA.accessToken, accountB.id),
    );
    await helpers.expectForbidden(() =>
      helpers.getAccountRaw(userB.accessToken, accountA.id),
    );
  });
});
