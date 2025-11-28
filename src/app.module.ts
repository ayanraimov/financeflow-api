import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './core/config/configuration';
import { validate } from './core/config/env.validation';
import { PrismaModule } from './infrastructure/database/prisma.module';
import { CacheModule } from './infrastructure/cache/cache.module';
import { AuthModule } from './domains/auth/auth.module';
import { UsersModule } from './domains/users/users.module';

@Module({
  imports: [
    // Configuration with validation
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
      envFilePath: '.env',
    }),

    // Rate Limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 10, // 10 requests per minute
      },
    ]),

    // Global Modules
    PrismaModule,
    CacheModule,
    AuthModule,
    UsersModule,

    // Domain Modules (we'll add them later)
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
