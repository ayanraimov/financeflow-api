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

        // Intenta obtener REDIS_URL primero (Railway/Production)
        const redisUrl = configService.get<string>('REDIS_URL');

        // Fallback a REDIS_HOST y REDIS_PORT (Development)
        const redisHost = configService.get<string>('REDIS_HOST', 'localhost');
        const redisPort = configService.get<number>('REDIS_PORT', 6379);

        // Si no hay REDIS_URL ni REDIS_HOST configurado, usa in-memory cache
        if (!redisUrl && redisHost === 'localhost') {
          logger.warn('⚠️  Redis not configured, using in-memory cache');
          return {
            ttl: 300000,
            max: 100, // Máximo 100 items en memoria
          };
        }

        try {
          let store;

          if (redisUrl) {
            // Parsear REDIS_URL (formato: redis://user:password@host:port)
            const url = new URL(redisUrl);
            logger.log(`🔌 Connecting to Redis at ${url.hostname}:${url.port}`);

            store = await redisStore({
              socket: {
                host: url.hostname,
                port: parseInt(url.port) || 6379,
              },
              password: url.password || undefined,
              username: url.username || undefined,
              ttl: 300000,
            });
          } else {
            // Usar REDIS_HOST y REDIS_PORT
            logger.log(`🔌 Connecting to Redis at ${redisHost}:${redisPort}`);

            store = await redisStore({
              socket: {
                host: redisHost,
                port: redisPort,
              },
              ttl: 300000,
            });
          }

          logger.log('✅ Redis cache store initialized successfully');
          return { store };
        } catch (error) {
          logger.error(
            '❌ Redis connection failed, falling back to in-memory cache:',
            error.message,
          );

          // Fallback a in-memory cache si Redis falla
          return {
            ttl: 300000,
            max: 100,
          };
        }
      },
      isGlobal: true,
    }),
  ],
})
export class CacheModule {}
