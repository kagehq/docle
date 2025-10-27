import type { Redis } from 'ioredis';
import type { RateLimiter, RateLimitConfig, RateLimitResult } from './types';

export class RedisRateLimiter implements RateLimiter {
  private redis: Redis;
  private prefix: string;

  constructor(redis: Redis, options?: { prefix?: string }) {
    this.redis = redis;
    this.prefix = options?.prefix || 'docle:ratelimit';
  }

  async check(config: RateLimitConfig): Promise<RateLimitResult> {
    const { userId, limit = 100, windowMs = 60000 } = config;
    const key = `${this.prefix}:${userId}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      // Add current request timestamp
      await this.redis.zadd(key, now, `${now}-${Math.random()}`);

      // Remove old entries outside the window
      await this.redis.zremrangebyscore(key, 0, windowStart);

      // Count requests in current window
      const count = await this.redis.zcard(key);

      // Set expiry
      await this.redis.expire(key, Math.ceil(windowMs / 1000));

      const remaining = Math.max(0, limit - count);
      const success = count <= limit;

      return {
        success,
        remaining,
        limit,
        reset: new Date(now + windowMs)
      };
    } catch (error) {
      console.error('Redis rate limit check failed:', error);
      // Fail open to avoid blocking requests on Redis errors
      return {
        success: true,
        remaining: limit,
        limit,
        reset: new Date(now + windowMs)
      };
    }
  }

  async reset(userId: string): Promise<void> {
    const key = `${this.prefix}:${userId}`;
    await this.redis.del(key);
  }
}

/**
 * Create a Redis rate limiter
 *
 * @example
 * ```typescript
 * import Redis from 'ioredis';
 * import { createRedisRateLimiter } from '@doclehq/rate-limit';
 *
 * const redis = new Redis(process.env.REDIS_URL);
 * const limiter = createRedisRateLimiter(redis);
 *
 * // Check rate limit
 * const result = await limiter.check({
 *   userId: 'user_123',
 *   limit: 100,
 *   windowMs: 60000
 * });
 *
 * if (!result.success) {
 *   throw new Error('Rate limit exceeded');
 * }
 * ```
 */
export function createRedisRateLimiter(
  redis: Redis,
  options?: { prefix?: string }
): RateLimiter {
  return new RedisRateLimiter(redis, options);
}

