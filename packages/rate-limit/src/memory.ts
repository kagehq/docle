import type { RateLimiter, RateLimitConfig, RateLimitResult } from './types';

interface RateLimitEntry {
  timestamps: number[];
}

export class MemoryRateLimiter implements RateLimiter {
  private limits: Map<string, RateLimitEntry>;
  private cleanupInterval: NodeJS.Timeout | null;

  constructor(options?: { cleanupIntervalMs?: number }) {
    this.limits = new Map();
    this.cleanupInterval = null;

    // Start cleanup interval
    const cleanupMs = options?.cleanupIntervalMs || 300000; // 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), cleanupMs);
  }

  async check(config: RateLimitConfig): Promise<RateLimitResult> {
    const { userId, limit = 100, windowMs = 60000 } = config;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or create user entry
    let entry = this.limits.get(userId);
    if (!entry) {
      entry = { timestamps: [] };
      this.limits.set(userId, entry);
    }

    // Remove old timestamps
    entry.timestamps = entry.timestamps.filter(ts => ts > windowStart);

    // Add current timestamp
    entry.timestamps.push(now);

    const count = entry.timestamps.length;
    const remaining = Math.max(0, limit - count);
    const success = count <= limit;

    return {
      success,
      remaining,
      limit,
      reset: new Date(now + windowMs)
    };
  }

  async reset(userId: string): Promise<void> {
    this.limits.delete(userId);
  }

  /**
   * Clean up old entries
   */
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour

    for (const [userId, entry] of this.limits.entries()) {
      if (entry.timestamps.length === 0 ||
          Math.max(...entry.timestamps) < now - maxAge) {
        this.limits.delete(userId);
      }
    }
  }

  /**
   * Stop cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

/**
 * Create an in-memory rate limiter
 *
 * **Warning:** For development/testing only.
 * Data is lost on process restart and not shared across instances.
 *
 * @example
 * ```typescript
 * import { createMemoryRateLimiter } from '@doclehq/rate-limit';
 *
 * const limiter = createMemoryRateLimiter();
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
export function createMemoryRateLimiter(options?: {
  cleanupIntervalMs?: number
}): RateLimiter {
  return new MemoryRateLimiter(options);
}

