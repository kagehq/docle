# Docle

**Run untrusted code safely.** Let your users execute Python and Node.js code without worrying about security.

## Why Docle?

Your app needs to run code you didn't write:
- **AI agents** generating and running scripts
- **Educational platforms** with live coding exercises
- **SaaS plugins** letting customers write custom logic
- **Data tools** where users analyze their own data

But running untrusted code is scary. Docle makes it safe and simple.

## What you get

- **Fast** - Runs on Cloudflare's edge network
- **Secure** - Isolated sandboxes, can't touch your infrastructure  
- **Full-featured** - npm/pip packages, multi-file projects
- **Works everywhere** - React, Vue, vanilla JS, or REST API

## Get started

### 1. Get an API key

Sign up at [app.docle.co/login](https://app.docle.co/login) to get your free API key.

### 2. Choose your integration

**Server-side (Recommended):**
```bash
npm install @doclehq/sdk     # For backend/API routes
```

**With UI (React/Vue):**
```bash
npm install @doclehq/react   # React components + hooks
npm install @doclehq/vue     # Vue components + composables
```

**Quick test (CDN):**
```html
<script src="https://unpkg.com/@doclehq/embed@latest/dist/embed.js"></script>
```

## Secure Integration (Recommended)

### React with Server Proxy

**Step 1: Create a server endpoint**

```typescript
// app/api/docle/route.ts (Next.js App Router)
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { code, lang, policy } = await req.json();
  
  // Your API key stays server-side!
  const result = await fetch('https://api.docle.co/api/run', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.DOCLE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ code, lang, policy })
  });
  
  return NextResponse.json(await result.json());
}
```

**Step 2: Use the hook in your component**

```tsx
import { useDocle } from '@doclehq/react';

function MyEditor() {
  // Points to YOUR server, not Docle API
  const { run, result, loading } = useDocle({ 
    endpoint: '/api/docle'  // Your server endpoint
  });
  
  const [code, setCode] = useState('print("Hello!")');

  return (
    <div>
      <textarea value={code} onChange={(e) => setCode(e.target.value)} />
      <button onClick={() => run(code, { lang: 'python' })} disabled={loading}>
        Run
      </button>
      {result && <pre>{result.stdout}</pre>}
    </div>
  );
}
```

### Vue with Server Proxy

**Step 1: Create a server endpoint**

```typescript
// server/api/docle/run.post.ts (Nuxt 3)
export default defineEventHandler(async (event) => {
  const { code, lang, policy } = await readBody(event);
  
  // Your API key stays server-side!
  return await $fetch('https://api.docle.co/api/run', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.DOCLE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: { code, lang, policy }
  });
});
```

**Step 2: Use the composable**

```vue
<script setup>
import { ref } from 'vue';
import { useDocle } from '@doclehq/vue';

const { run, result, loading } = useDocle({ 
  endpoint: '/api/docle/run'  // Your server endpoint
});
const code = ref('print("Hello!")');
</script>

<template>
  <div>
    <textarea v-model="code" />
    <button @click="run(code, { lang: 'python' })" :disabled="loading">
      Run
    </button>
    <pre v-if="result">{{ result.stdout }}</pre>
  </div>
</template>
```

### REST API (Server-side)

```bash
curl -X POST https://api.docle.co/api/run \
  -H "Authorization: Bearer sk_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"code": "print(\"Hello!\")", "lang": "python"}'
```

**Response:**
```json
{
  "ok": true,
  "exitCode": 0,
  "stdout": "Hello!\n",
  "stderr": ""
}
```

### TypeScript SDK (Server-side)

```typescript
import { runSandbox } from '@doclehq/sdk';

const result = await runSandbox('print("Hello!")', {
  lang: 'python',
  apiKey: process.env.DOCLE_API_KEY
});

console.log(result.stdout); // "Hello!"
```

## Alternative: Direct API Usage

> **Security Warning**  
> The patterns below expose your API key client-side. Only use these if:
> - You've set up domain restrictions in your dashboard
> - You understand the security implications
> - You're prototyping/testing

### React Component (with domain restrictions)

```tsx
import { DoclePlayground } from '@doclehq/react';

<DoclePlayground 
  lang="python"
  code="print('Hello!')"
  apiKey="sk_live_YOUR_KEY"
  onRun={(result) => console.log(result)}
/>
```

### Vue Component (with domain restrictions)

```vue
<script setup>
import { DoclePlayground } from '@doclehq/vue';
</script>

<template>
  <DoclePlayground 
    lang="python"
    code="print('Hello!')"
    api-key="sk_live_YOUR_KEY"
  />
</template>
```

### CDN Embed (with domain restrictions)

```html
<script src="https://unpkg.com/@doclehq/embed@latest/dist/embed.js"></script>
<script>
  window.docleApiKey = 'sk_live_YOUR_KEY';
</script>

<div data-docle data-lang="python">
print("Hello!")
</div>
```

## Self-Hosted Docle

If you deploy your own Docle instance, use the `endpoint` option to point to it:

```typescript
const { run } = useDocle({ 
  endpoint: 'https://docle.yourcompany.com'  // Your self-hosted instance
});

await run(code, { 
  lang: 'python',
  apiKey: 'your_key'  // Your self-hosted API key
});
```

## Security Best Practices

**Always use server-side proxies for production apps**
- Keeps API keys secure
- Allows you to add custom auth/rate limiting
- Gives you full control over executions

**Use domain restrictions as a backup**
- Set allowed domains in your dashboard
- Prevents key theft if accidentally exposed
- Not a replacement for server-side security

**Monitor your usage**
- Check analytics in your dashboard
- Set up rate limits per project
- Revoke compromised keys immediately

## Advanced: Per-User Rate Limiting

For SaaS apps with multiple users, implement per-user rate limiting in your server proxy to ensure fair usage.

### Why Per-User Rate Limiting?

**Without per-user limits (per-key only):**
- All users share one API key's rate limit
- One abusive user affects everyone
- Hard to implement fair usage policies

**With per-user limits:**
- Each user gets their own quota
- Isolated limits - one user can't exhaust quota for others
- Better abuse prevention and scalability

### Implementation with Redis

```typescript
// lib/rate-limit.ts
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function checkUserRateLimit({
  userId,
  limit = 100,
  windowMs = 60000 // 1 minute
}: {
  userId: string;
  limit?: number;
  windowMs?: number;
}) {
  const key = `rate-limit:user:${userId}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  // Add current request timestamp
  await redis.zadd(key, now, `${now}`);
  
  // Remove old entries outside the window
  await redis.zremrangebyscore(key, 0, windowStart);
  
  // Count requests in current window
  const count = await redis.zcard(key);
  
  // Set expiry
  await redis.expire(key, Math.ceil(windowMs / 1000));
  
  const remaining = Math.max(0, limit - count);
  const success = count <= limit;
  
  return {
    success,
    remaining,
    limit,
    reset: new Date(now + windowMs)
  };
}

// app/api/docle/route.ts
import { checkUserRateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const { code, lang, policy } = await req.json();
  
  // Authenticate user
  const session = await getServerSession();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Check per-user rate limit
  const rateLimit = await checkUserRateLimit({
    userId: session.user.id,
    limit: 100,      // 100 requests
    windowMs: 60000  // per minute
  });
  
  if (!rateLimit.success) {
    return Response.json({ 
      error: 'Rate limit exceeded',
      remaining: rateLimit.remaining,
      reset: rateLimit.reset
    }, { 
      status: 429,
      headers: {
        'X-RateLimit-Limit': rateLimit.limit.toString(),
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': rateLimit.reset.toISOString()
      }
    });
  }
  
  // Proxy to Docle
  const result = await fetch('https://api.docle.co/api/run', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.DOCLE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ code, lang, policy })
  });
  
  return Response.json(await result.json());
}
```

### Implementation with Upstash

Perfect for edge/serverless environments:

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Create rate limiter
export const userRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
  analytics: true,
  prefix: 'docle:user',
});

// In your API route
export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Check rate limit
  const { success, limit, remaining, reset } = await userRateLimit.limit(
    session.user.id
  );
  
  if (!success) {
    return Response.json({ 
      error: 'Rate limit exceeded',
      reset: new Date(reset)
    }, { status: 429 });
  }
  
  // ... rest of proxy logic
}
```

### Implementation with In-Memory (Development)

For local development without Redis:

```typescript
// lib/rate-limit.ts
interface RateLimitEntry {
  timestamps: number[];
}

const rateLimits = new Map<string, RateLimitEntry>();

export function checkUserRateLimit({
  userId,
  limit = 100,
  windowMs = 60000
}: {
  userId: string;
  limit?: number;
  windowMs?: number;
}) {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // Get or create user entry
  let entry = rateLimits.get(userId);
  if (!entry) {
    entry = { timestamps: [] };
    rateLimits.set(userId, entry);
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

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [userId, entry] of rateLimits.entries()) {
    if (entry.timestamps.length === 0 || 
        Math.max(...entry.timestamps) < now - 3600000) {
      rateLimits.delete(userId);
    }
  }
}, 300000); // Every 5 minutes
```

### Tiered Rate Limiting

Different limits for different user tiers:

```typescript
const RATE_LIMITS = {
  free: { requests: 100, windowMs: 60000 },   // 100/min
  pro: { requests: 1000, windowMs: 60000 },   // 1000/min
  enterprise: { requests: 10000, windowMs: 60000 } // 10000/min
};

export async function POST(req: Request) {
  const session = await getServerSession();
  const userTier = session.user.tier || 'free';
  
  const { requests, windowMs } = RATE_LIMITS[userTier];
  
  const rateLimit = await checkUserRateLimit({
    userId: session.user.id,
    limit: requests,
    windowMs
  });
  
  // ... rest of logic
}
```

## Examples

Check out [examples/](examples/) for working demos of secure integration patterns.

## Need more?

- **[Detailed Docs](DETAILED.md)** - Complete API reference
- **[React Docs](packages/react/README.md)** - React integration
- **[Vue Docs](packages/vue/README.md)** - Vue integration
- **[SDK Docs](sdk/README.md)** - TypeScript SDK

## Run locally

```bash
git clone https://github.com/kagehq/docle.git
cd docle
npm install
cd playground && npm install && cd ..
./start.sh
```

Visit **http://localhost:3001** for the playground.

> **Note:** Real code execution only works in production (needs Cloudflare Sandbox). Local dev uses simulation mode.

## Deploy your own

Docle runs on Cloudflare Workers. Requirements:
- Cloudflare account
- Workers Paid plan ($5/month) for Sandbox access

---

FSL-1.1-MIT License. See LICENSE file for details.

**Built with ❤️ using [Cloudflare Workers](https://workers.cloudflare.com) and [Cloudflare Sandbox](https://developers.cloudflare.com/sandbox/)**
