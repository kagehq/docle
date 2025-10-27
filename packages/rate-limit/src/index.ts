// Types
export type {
  RateLimitResult,
  RateLimitConfig,
  RateLimiter,
  RateLimitTier,
  TieredLimits
} from './types';

// Implementations
export { createRedisRateLimiter, RedisRateLimiter } from './redis';
export { createUpstashRateLimiter, UpstashRateLimiter } from './upstash';
export { createMemoryRateLimiter, MemoryRateLimiter } from './memory';

// Helpers
import type { RateLimiter, RateLimitConfig, TieredLimits } from './types';

/**
 * Create a tiered rate limiter that adjusts limits based on user tier
 *
 * @example
 * ```typescript
 * const limiter = createTieredRateLimiter(baseL imiter, {
 *   free: { requests: 100, windowMs: 60000 },
 *   pro: { requests: 1000, windowMs: 60000 },
 *   enterprise: { requests: 10000, windowMs: 60000 }
 * });
 *
 * const result = await limiter.check({
 *   userId: 'user_123',
 *   tier: 'pro'
 * });
 * ```
 */
export function createTieredRateLimiter(
  baseLimiter: RateLimiter,
  tiers: TieredLimits
) {
  return {
    async check(config: RateLimitConfig & { tier?: string }) {
      const tier = config.tier || 'free';
      const limits = tiers[tier] || tiers.free || { requests: 100, windowMs: 60000 };

      return baseLimiter.check({
        ...config,
        limit: limits.requests,
        windowMs: limits.windowMs
      });
    },
    async reset(userId: string) {
      return baseLimiter.reset(userId);
    }
  };
}

/**
 * Create rate limit headers for HTTP responses
 */
export function createRateLimitHeaders(result: import('./types').RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toISOString()
  };
}

