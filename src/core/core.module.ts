import { Module, Global } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { CacheModule } from '../infrastructure/cache/cache.module';
import { CacheInvalidationService } from './services/cache-invalidation.service';
import { AllExceptionsFilter } from './exceptions/http-exception.filter';

@Global()
@Module({
  imports: [CacheModule],
  providers: [
    CacheInvalidationService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
  exports: [CacheInvalidationService],
})
export class CoreModule {}
