import { Module, Logger } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';

@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        const logger = new Logger('CacheModule');

        if (!redisUrl) {
          logger.warn('REDIS_URL not configured, using in-memory cache');
          return {
            ttl: 300000,
            max: 100,
          };
        }

        try {
          const store = await redisStore({
            url: redisUrl,
            ttl: 300000,
          });

          logger.log('Redis cache connected successfully');
          return {
            store,
            ttl: 300000,
            max: 100,
          };
        } catch (error) {
          logger.error('Redis connection failed, falling back to in-memory cache');
          logger.error(error.message);
          return {
            ttl: 300000,
            max: 100,
          };
        }
      },
    }),
  ],
  exports: [NestCacheModule],
})
export class CacheModule {}
