import { Module, Global } from '@nestjs/common';
import { CacheInvalidationService } from './services/cache-invalidation.service';
import { CacheModule } from '../infrastructure/cache/cache.module';

@Global()
@Module({
  imports: [CacheModule], // ✅ Importar tu CacheModule existente
  providers: [CacheInvalidationService],
  exports: [CacheInvalidationService],
})
export class CoreModule {}
