import { Module, Global, Logger } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('CacheModule');

        const host = configService.get<string>('REDIS_HOST', 'localhost');
        const port = configService.get<number>('REDIS_PORT', 6379);

        logger.log(`🔌 Connecting to Redis at ${host}:${port}`);

        try {
          const store = await redisStore({
            socket: {
              host,
              port,
            },
            ttl: 300000, // 5 minutos (300 segundos = 300000 ms)
          });

          logger.log('✅ Redis cache store initialized successfully');
          return { store };
        } catch (error) {
          logger.error(
            '❌ Redis cache store initialization failed:',
            error.message,
          );
          throw error;
        }
      },
      isGlobal: true,
    }),
  ],
})
export class CacheModule {}
