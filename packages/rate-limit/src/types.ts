export interface RateLimitResult {
  success: boolean;
  remaining: number;
  limit: number;
  reset: Date;
}

export interface RateLimitConfig {
  /**
   * User identifier (email, ID, etc.)
   */
  userId: string;

  /**
   * Maximum number of requests allowed
   * @default 100
   */
  limit?: number;

  /**
   * Time window in milliseconds
   * @default 60000 (1 minute)
   */
  windowMs?: number;
}

export interface RateLimiter {
  /**
   * Check if user has exceeded rate limit
   */
  check(config: RateLimitConfig): Promise<RateLimitResult>;

  /**
   * Reset rate limit for a user
   */
  reset(userId: string): Promise<void>;
}

export type RateLimitTier = {
  requests: number;
  windowMs: number;
};

export type TieredLimits = Record<string, RateLimitTier>;

