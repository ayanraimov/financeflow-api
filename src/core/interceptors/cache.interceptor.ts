import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  Inject,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager'; // ✅ Import tipo
import { CACHE_KEY, CACHE_TTL } from '../decorators/cache-result.decorator';
import * as crypto from 'crypto';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();

    // Obtener metadata del decorator
    const cacheKey = this.reflector.get<string>(CACHE_KEY, handler);
    const ttl = this.reflector.get<number>(CACHE_TTL, handler);

    // Si no hay cacheKey, no cachear
    if (!cacheKey) {
      return next.handle();
    }

    // Extraer userId del request
    const user = request.user as { sub?: string; id?: string } | undefined;
    const userId = user?.sub || user?.id || 'anonymous';

    // Construir cache key final con userId y hash de args
    const args = this.extractMethodArgs(context);
    const argsHash = this.hashArgs(args);
    const finalKey = `${cacheKey}:${userId}:${argsHash}`;

    // Intentar obtener del cache
    const cachedResult = await this.cacheManager.get(finalKey);
    if (cachedResult) {
      this.logger.debug(`✅ Cache HIT: ${finalKey}`);
      return of(cachedResult);
    }

    this.logger.debug(`❌ Cache MISS: ${finalKey}`);

    // Si no hay cache, ejecutar y guardar resultado
    return next.handle().pipe(
      tap(async (response) => {
        if (response) {
          // TTL en milisegundos (cache-manager usa ms)
          const ttlMs = ttl ? ttl * 1000 : 300000; // Default 5 min
          await this.cacheManager.set(finalKey, response, ttlMs);
          this.logger.debug(`💾 Cached: ${finalKey} (TTL: ${ttl}s)`);
        }
      }),
    );
  }

  private extractMethodArgs(context: ExecutionContext): Record<string, any> {
    const request = context.switchToHttp().getRequest();
    return {
      params: request.params as Record<string, any>,
      query: request.query as Record<string, any>,
    };
  }

  private hashArgs(args: Record<string, any>): string {
    const stringified = JSON.stringify(args);
    return crypto.createHash('md5').update(stringified).digest('hex');
  }
}
