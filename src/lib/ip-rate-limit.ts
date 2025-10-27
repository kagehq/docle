/**
 * IP-based Rate Limiting for Docle
 * Prevents abuse by limiting requests per IP address
 * Used for endpoints that don't require authentication (e.g., magic link requests)
 */

import type { Env } from "./kv";

export interface IPRateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number; // Unix timestamp when limit resets
}

/**
 * Check if IP address has exceeded rate limit for a specific action
 * @param env - Cloudflare environment bindings
 * @param ipAddress - IP address to check
 * @param action - Action identifier (e.g., "auth-request", "api-call")
 * @param limit - Maximum requests per time window
 * @param windowMinutes - Time window in minutes (default: 15 minutes)
 * @returns Rate limit status
 */
export async function checkIPRateLimit(
  env: Env,
  ipAddress: string,
  action: string,
  limit: number,
  windowMinutes: number = 15
): Promise<IPRateLimitResult> {
  // Create a time window key
  const now = Date.now();
  const currentWindow = Math.floor(now / (windowMinutes * 60000));
  const key = `ip_ratelimit:${action}:${ipAddress}:${currentWindow}`;
  const resetAt = (currentWindow + 1) * (windowMinutes * 60000);

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
      expirationTtl: (windowMinutes + 5) * 60, // Keep for window + 5 min buffer
    });

    return {
      allowed: true,
      limit,
      remaining: limit - newCount,
      resetAt,
    };
  } catch (error) {
    console.error("IP rate limit check failed:", error);
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
 * Format reset time as human-readable string for IP rate limits
 * @param resetAt - Unix timestamp
 * @returns Human-readable string like "5 minutes" or "30 seconds"
 */
export function formatIPResetTime(resetAt: number): string {
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
