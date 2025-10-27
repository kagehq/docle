# @doclehq/rate-limit

Per-user rate limiting utilities for Docle. Ensures fair usage when multiple users share the same API key.

## Installation

```bash
npm install @doclehq/rate-limit
```

## Quick Start

### With Redis

```typescript
import Redis from 'ioredis';
import { createRedisRateLimiter } from '@doclehq/rate-limit';

const redis = new Redis(process.env.REDIS_URL);
const limiter = createRedisRateLimiter(redis);

// In your API route
const result = await limiter.check({
  userId: 'user_123',
  limit: 100,      // 100 requests
  windowMs: 60000  // per minute
});

if (!result.success) {
  return Response.json({ 
    error: 'Rate limit exceeded',
    resetAt: result.reset 
  }, { status: 429 });
}
```

### With Upstash (Edge/Serverless)

```typescript
import { Redis } from '@upstash/redis';
import { createUpstashRateLimiter } from '@doclehq/rate-limit';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const limiter = createUpstashRateLimiter(redis);

const result = await limiter.check({
  userId: session.user.id,
  limit: 100,
  windowMs: 60000
});
```

### With In-Memory (Development)

```typescript
import { createMemoryRateLimiter } from '@doclehq/rate-limit';

const limiter = createMemoryRateLimiter();

const result = await limiter.check({
  userId: 'user_123',
  limit: 100,
  windowMs: 60000
});
```

> **Warning:** In-memory limiter is for development only. Data is lost on restart and not shared across instances.

## Features

✅ **Multiple backends** - Redis, Upstash, or in-memory  
✅ **Sliding window** - Accurate rate limiting  
✅ **TypeScript** - Full type safety  
✅ **Tiered limits** - Different limits for different user tiers  
✅ **HTTP headers** - Standard rate limit headers  
✅ **Fail-open** - Doesn't block on storage errors  

## API Reference

### `createRedisRateLimiter(redis, options?)`

Create a Redis-based rate limiter.

**Parameters:**
- `redis` - ioredis instance
- `options.prefix` - Key prefix (default: `'docle:ratelimit'`)

**Returns:** `RateLimiter`

### `createUpstashRateLimiter(redis, options?)`

Create an Upstash-based rate limiter (perfect for edge/serverless).

**Parameters:**
- `redis` - Upstash Redis instance
- `options.prefix` - Key prefix (default: `'docle:ratelimit'`)

**Returns:** `RateLimiter`

### `createMemoryRateLimiter(options?)`

Create an in-memory rate limiter (development only).

**Parameters:**
- `options.cleanupIntervalMs` - Cleanup interval (default: `300000` / 5 minutes)

**Returns:** `RateLimiter`

### `RateLimiter.check(config)`

Check if user has exceeded rate limit.

**Parameters:**
```typescript
{
  userId: string;      // User identifier
  limit?: number;      // Max requests (default: 100)
  windowMs?: number;   // Time window in ms (default: 60000 / 1 minute)
}
```

**Returns:** `Promise<RateLimitResult>`
```typescript
{
  success: boolean;    // true if under limit
  remaining: number;   // Requests remaining
  limit: number;       // Total limit
  reset: Date;         // When limit resets
}
```

### `RateLimiter.reset(userId)`

Reset rate limit for a user.

**Parameters:**
- `userId` - User identifier

**Returns:** `Promise<void>`

## Advanced Usage

### Tiered Rate Limiting

Different limits for different user tiers:

```typescript
import { createTieredRateLimiter, createRedisRateLimiter } from '@doclehq/rate-limit';

const baseLimiter = createRedisRateLimiter(redis);

const limiter = createTieredRateLimiter(baseLimiter, {
  free: { requests: 100, windowMs: 60000 },
  pro: { requests: 1000, windowMs: 60000 },
  enterprise: { requests: 10000, windowMs: 60000 }
});

// Check with user tier
const result = await limiter.check({
  userId: session.user.id,
  tier: session.user.tier // 'free', 'pro', or 'enterprise'
});
```

### HTTP Headers

Add standard rate limit headers to responses:

```typescript
import { createRateLimitHeaders } from '@doclehq/rate-limit';

const result = await limiter.check({ userId: 'user_123' });

const headers = createRateLimitHeaders(result);
// {
//   'X-RateLimit-Limit': '100',
//   'X-RateLimit-Remaining': '95',
//   'X-RateLimit-Reset': '2025-01-27T12:00:00.000Z'
// }

return Response.json(data, { headers });
```

### Next.js Middleware

Apply rate limiting to all API routes:

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createRedisRateLimiter } from '@doclehq/rate-limit';

const limiter = createRedisRateLimiter(redis);

export async function middleware(request: NextRequest) {
  const session = await getSession(request);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const result = await limiter.check({
    userId: session.user.id,
    limit: 100,
    windowMs: 60000
  });
  
  if (!result.success) {
    return NextResponse.json({ 
      error: 'Rate limit exceeded' 
    }, { 
      status: 429,
      headers: createRateLimitHeaders(result)
    });
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/api/docle/:path*'
};
```

## Examples

### Complete Next.js Example

```typescript
// app/api/docle/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createRedisRateLimiter, createRateLimitHeaders } from '@doclehq/rate-limit';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);
const limiter = createRedisRateLimiter(redis);

export async function POST(req: Request) {
  // 1. Authenticate
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // 2. Check rate limit
  const rateLimit = await limiter.check({
    userId: session.user.id,
    limit: 100,
    windowMs: 60000
  });
  
  if (!rateLimit.success) {
    return NextResponse.json({ 
      error: 'Rate limit exceeded',
      resetAt: rateLimit.reset 
    }, { 
      status: 429,
      headers: createRateLimitHeaders(rateLimit)
    });
  }
  
  // 3. Proxy to Docle
  const { code, lang, policy } = await req.json();
  
  const result = await fetch('https://api.docle.co/api/run', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.DOCLE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ code, lang, policy })
  });
  
  const data = await result.json();
  
  return NextResponse.json(data, {
    headers: createRateLimitHeaders(rateLimit)
  });
}
```

## License

MIT

