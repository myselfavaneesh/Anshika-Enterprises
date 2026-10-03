import IORedis from 'ioredis';
import { logger } from '../utils/logger';

interface CacheEntry<T = any> {
  value: T;
  expiresAt: number;
}

class CacheService {
  private redis: IORedis | null = null;
  private isRedisReady = false;
  private memoryCache: Map<string, CacheEntry> = new Map();

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        this.redis = new IORedis(redisUrl, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          retryStrategy(times) {
            if (times > 3) return null;
            return Math.min(times * 1000, 2000);
          },
        });

        this.redis.on('connect', () => {
          this.isRedisReady = true;
          logger.info('[CacheService] Connected to Redis for tenant caching.');
        });

        this.redis.on('error', (err) => {
          this.isRedisReady = false;
        });

        this.redis.connect().catch(() => {
          this.isRedisReady = false;
        });
      } catch (err: any) {
        this.isRedisReady = false;
      }
    }
  }

  private buildKey(tenantId: string, key: string): string {
    const sanitizedTenant = tenantId || 'default-tenant';
    return `md:cache:${sanitizedTenant}:${key}`;
  }

  async get<T>(tenantId: string, key: string): Promise<T | null> {
    const fullKey = this.buildKey(tenantId, key);

    if (this.isRedisReady && this.redis) {
      try {
        const raw = await this.redis.get(fullKey);
        if (raw) return JSON.parse(raw) as T;
      } catch (err: any) {
        // Fall back to memory cache
      }
    }

    const mem = this.memoryCache.get(fullKey);
    if (mem) {
      if (Date.now() > mem.expiresAt) {
        this.memoryCache.delete(fullKey);
        return null;
      }
      return mem.value as T;
    }

    return null;
  }

  async set<T>(tenantId: string, key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    const fullKey = this.buildKey(tenantId, key);

    if (this.isRedisReady && this.redis) {
      try {
        await this.redis.set(fullKey, JSON.stringify(value), 'EX', ttlSeconds);
        return;
      } catch (err: any) {
        // Fall back to memory
      }
    }

    this.memoryCache.set(fullKey, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(tenantId: string, key: string): Promise<void> {
    const fullKey = this.buildKey(tenantId, key);

    if (this.isRedisReady && this.redis) {
      try {
        await this.redis.del(fullKey);
      } catch (err) {}
    }

    this.memoryCache.delete(fullKey);
  }

  async delPattern(tenantId: string, pattern: string): Promise<void> {
    const prefix = this.buildKey(tenantId, pattern).replace('*', '');

    if (this.isRedisReady && this.redis) {
      try {
        const keys = await this.redis.keys(`${prefix}*`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch (err) {}
    }

    for (const k of this.memoryCache.keys()) {
      if (k.startsWith(prefix)) {
        this.memoryCache.delete(k);
      }
    }
  }
}

export const cacheService = new CacheService();
export default cacheService;
