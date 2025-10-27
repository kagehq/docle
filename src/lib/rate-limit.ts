/**
 * Rate Limiting for Docle API Keys
 * Uses KV store to track requests per API key per minute
 */

import type { Env } from "./kv";

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number; // Unix timestamp when limit resets
}

/**
 * Check if API key has exceeded its rate limit
 * @param env - Cloudflare environment bindings
 * @param apiKeyHash - Hashed API key (for privacy)
 * @param limit - Maximum requests per minute for this key
 * @returns Rate limit status
 */
export async function checkRateLimit(
  env: Env,
  apiKeyHash: string,
  limit: number
): Promise<RateLimitResult> {
  // Create a time window key (per minute)
  const now = Date.now();
  const currentMinute = Math.floor(now / 60000); // Round down to current minute
  const key = `ratelimit:${apiKeyHash}:${currentMinute}`;
  const resetAt = (currentMinute + 1) * 60000; // Next minute timestamp

  try {
    // Get current count from KV
    const currentCountStr = await env.RUNS.get(key);
    const currentCount = currentCountStr ? parseInt(currentCountStr) : 0;

    // Check if limit exceeded
    if (currentCount >= limit) {
      return {
        allowed: false,
        limit,
        remaining: 0,
        resetAt,
      };
    }

    // Increment counter
    const newCount = currentCount + 1;
    await env.RUNS.put(key, newCount.toString(), {
      expirationTtl: 120, // Keep for 2 minutes (current + buffer)
    });

    return {
      allowed: true,
      limit,
      remaining: limit - newCount,
      resetAt,
    };
  } catch (error) {
    console.error("Rate limit check failed:", error);
    // On error, allow the request (fail open)
    return {
      allowed: true,
      limit,
      remaining: limit,
      resetAt,
    };
  }
}

/**
 * Format reset time as human-readable string
 * @param resetAt - Unix timestamp
 * @returns Human-readable string like "30 seconds"
 */
export function formatResetTime(resetAt: number): string {
  const secondsUntilReset = Math.ceil((resetAt - Date.now()) / 1000);

  if (secondsUntilReset <= 0) {
    return "now";
  }

  if (secondsUntilReset < 60) {
    return `${secondsUntilReset} second${secondsUntilReset === 1 ? "" : "s"}`;
  }

  const minutes = Math.ceil(secondsUntilReset / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

