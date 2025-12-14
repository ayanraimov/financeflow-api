import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './core/config/configuration';
import { validate } from './core/config/env.validation';
import { PrismaModule } from './infrastructure/database/prisma.module';
import { CacheModule } from './infrastructure/cache/cache.module';
import { AuthModule } from './domains/auth/auth.module';
import { UsersModule } from './domains/users/users.module';
import { AccountsModule } from './domains/accounts/accounts.module';
import { TransactionsModule } from './domains/transactions/transactions.module';
import { CategoriesModule } from './domains/categories/categories.module';
import { BudgetsModule } from './domains/budgets/budgets.module';
import { AnalyticsModule } from './domains/analytics/analytics.module';
import { CoreModule } from './core/core.module';
import { APP_GUARD } from '@nestjs/core';
import { HealthModule } from './health/health.module';

// ⭐ Detectar ambiente de testing
const isTestEnv = process.env.NODE_ENV === 'test';

@Module({
  imports: [
    // Configuration with validation
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
    }),

    // ⭐ Rate Limiting - Solo en producción/desarrollo, NO en tests
    ...(isTestEnv
      ? []
      : [
        ThrottlerModule.forRoot([
          {
            name: 'default',
            ttl: 60000, // 1 minute
            limit: 100, // 100 requests per minute (general)
          },
          {
            name: 'auth',
            ttl: 60000, // 1 minute
            limit: 5, // 5 requests per minute (auth endpoints)
          },
          {
            name: 'strict',
            ttl: 600000, // 10 minutes
            limit: 3, // 3 requests per 10 minutes (register)
          },
          {
            name: 'analytics',
            ttl: 60000, // 1 minute
            limit: 30, // 30 requests per minute (heavy queries)
          },
        ]),
      ]),

    // Global Modules
    PrismaModule,
    CacheModule,
    AuthModule,
    UsersModule,
    AccountsModule,
    TransactionsModule,
    CategoriesModule,
    BudgetsModule,
    AnalyticsModule,
    CoreModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // ⭐ Throttler Guard - Solo en producción/desarrollo, NO en tests
    ...(isTestEnv
      ? []
      : [
        {
          provide: APP_GUARD,
          useClass: ThrottlerGuard,
        },
      ]),
  ],
})
export class AppModule {}
