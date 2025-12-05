import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class CacheInvalidationService {
  private readonly logger = new Logger(CacheInvalidationService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async invalidateAnalytics(userId: string): Promise<void> {
    const keys = [
      `analytics:overview:${userId}`,
      `analytics:spending:${userId}`,
      `analytics:income:${userId}`,
      `analytics:trends:${userId}`,
      `analytics:categories:${userId}`,
      `analytics:comparison:${userId}`,
    ];

    await this.deleteKeys(keys);
    this.logger.log(`🗑️ Invalidated analytics cache for user ${userId}`);
  }

  async invalidateBudgets(userId: string): Promise<void> {
    const keys = [
      `budgets:overview:${userId}`,
      `budgets:progress:${userId}`,
      `budgets:list:${userId}`,
    ];

    await this.deleteKeys(keys);
    this.logger.log(`🗑️ Invalidated budgets cache for user ${userId}`);
  }

  async invalidateAccounts(userId: string): Promise<void> {
    const keys = [
      `accounts:list:${userId}`,
      `accounts:balance:${userId}`,
    ];

    await this.deleteKeys(keys);
    this.logger.log(`🗑️ Invalidated accounts cache for user ${userId}`);
  }

  async invalidateTransactionRelated(userId: string): Promise<void> {
    await Promise.all([
      this.invalidateAnalytics(userId),
      this.invalidateBudgets(userId),
      this.invalidateAccounts(userId),
    ]);

    this.logger.log(
      `🗑️ Invalidated ALL transaction-related cache for user ${userId}`,
    );
  }

  private async deleteKeys(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => this.cacheManager.del(key)));
  }
}
