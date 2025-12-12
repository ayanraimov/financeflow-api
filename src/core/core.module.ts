import { Module, Global } from '@nestjs/common';
import { CacheInvalidationService } from './services/cache-invalidation.service';
import { CacheModule } from '../infrastructure/cache/cache.module';

@Global()
@Module({
  imports: [CacheModule],
  providers: [CacheInvalidationService],
  exports: [CacheInvalidationService],
})
export class CoreModule {}
