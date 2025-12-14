import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { CacheModule } from '../../infrastructure/cache/cache.module'; // ← AGREGAR

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
