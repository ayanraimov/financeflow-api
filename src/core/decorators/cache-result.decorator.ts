import { SetMetadata } from '@nestjs/common';

export const CACHE_KEY = 'cache_key';
export const CACHE_TTL = 'cache_ttl';

/**
 * Decorator para cachear resultados de métodos
 * @param cacheKey Key base para el cache (ej: 'analytics:overview')
 * @param ttl Tiempo de vida en segundos (default: 300 = 5 min)
 */
export function CacheResult(cacheKey: string, ttl: number = 300) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(CACHE_KEY, cacheKey)(target, propertyKey, descriptor);
    SetMetadata(CACHE_TTL, ttl)(target, propertyKey, descriptor);
    return descriptor;
  };
}
