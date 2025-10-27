# Docle Documentation

**Docle** is a secure code execution platform built on Cloudflare Workers that lets you run untrusted Python and Node.js code safely at the edge. Deploy interactive code playgrounds, educational platforms, AI agents, and more with a single API call.

## Table of Contents

1. [Overview](#overview)
2. [Core Features](#core-features)
3. [Authentication & API Keys](#authentication--api-keys)
4. [Rate Limiting](#rate-limiting)
5. [Per-User Rate Limiting](#per-user-rate-limiting)
6. [User Context Tracking](#user-context-tracking)
7. [Usage Analytics](#usage-analytics)
8. [REST API Reference](#rest-api-reference)
9. [SDK & Framework Packages](#sdk--framework-packages)
10. [Embeddable Components](#embeddable-components)
11. [Security & Sandboxing](#security--sandboxing)
12. [Multi-File Projects](#multi-file-projects)
13. [Package Installation](#package-installation)
14. [Collaborative Editing](#collaborative-editing)
15. [Execution Policies](#execution-policies)
16. [Storage & History](#storage--history)
17. [Dashboard UI](#dashboard-ui)
18. [Architecture](#architecture)
19. [Use Cases](#use-cases)
20. [Deployment Guide](#deployment-guide)
21. [Performance & Limits](#performance--limits)
22. [Troubleshooting](#troubleshooting)

---

## Overview

Docle solves the hard problem of running untrusted code safely. Whether you're building an educational platform, a code interview tool, an AI agent with code execution, or a SaaS plugin system, Docle provides secure, isolated execution environments at the edge.

### Why Docle?

- **🔒 Zero Trust Security** - V8 isolates with no access to your infrastructure
- **⚡ Edge-Native** - Runs on Cloudflare's global network (<50ms latency)
- **🎨 Drop-in UI** - Beautiful code editor included
- **🌐 Framework Agnostic** - Works with React, Vue, vanilla JS, or pure REST
- **👥 Collaborative** - Real-time multi-user code editing
- **📦 Batteries Included** - npm/pip packages, multi-file projects, execution history

---

## Core Features

### Supported Languages

- **Python 3.x** - Full Python standard library
- **Node.js** - Modern JavaScript/TypeScript runtime

### Execution Capabilities

- ✅ Single-file code execution
- ✅ Multi-file project execution
- ✅ Third-party package installation (pip/npm)
- ✅ Custom entrypoint selection
- ✅ Configurable timeout, memory, and network policies
- ✅ Execution history and replay
- ✅ Real-time collaborative editing

### Integration Options

- **REST API** - Simple HTTP endpoints
- **TypeScript SDK** - Type-safe client library
- **React Components** - Pre-built UI components
- **Vue 3 Components** - Native Vue integration
- **CDN Embed** - One-line website integration
- **iframe Embed** - Sandboxed iframe embedding

---

## Authentication & API Keys

Docle uses **magic link** authentication for the dashboard and **API keys** for code execution.

### Magic Link Authentication

Passwordless authentication flow for dashboard access.

**How it works:**
1. User enters email on `/login`
2. Backend generates unique token & sends magic link
3. User clicks link in email
4. Backend creates session & sets cookie
5. User redirected to dashboard

**Security:**
- 15-minute token expiration
- Single-use tokens
- IP rate limiting (5 requests per 15 min)
- HttpOnly session cookies
- 30-day session expiration

**Request Magic Link:**
```bash
curl -X POST https://api.docle.co/auth/request \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

**Response:**
```json
{
  "message": "If an account exists, a magic link has been sent to your email"
}
```

### API Key Management

API keys authenticate `/api/run` requests. All code execution **requires a valid API key**.

**Key Format:** `sk_live_` + 48 random hex characters

**Features:**
- **Multiple keys per project** - Create unlimited keys
- **Custom names** - "Production", "Development", etc.
- **Domain restrictions** - Optional whitelist (supports wildcards)
- **Per-key rate limits** - 1 to 10,000 requests per minute
- **Revocation** - Instantly disable compromised keys
- **SHA-256 hashing** - Keys never stored in plaintext
- **Last used tracking** - Monitor key activity

### Creating API Keys

**Via Dashboard:**
1. Sign in at `https://app.docle.co`
2. Create a project
3. Click "Generate Key"
4. Configure name, domains, and rate limit
5. Copy key (shown once!)

**Via API:**
```bash
curl -X POST https://api.docle.co/api/projects/{project_id}/keys \
  -H "Cookie: docle_session=YOUR_SESSION" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production API",
    "allowedDomains": ["app.example.com", "*.example.com"],
    "rateLimitPerMinute": 300
  }'
```

**Response:**
```json
{
  "key": "sk_live_abc123...",
  "id": "key_xyz789"
}
```

⚠️ **Store this key securely! It won't be shown again.**

### Using API Keys

All `/api/run` requests **must** include an API key in the `Authorization` header:

```bash
curl -X POST https://api.docle.co/api/run \
  -H "Authorization: Bearer sk_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "print(\"Hello, World!\")",
    "lang": "python"
  }'
```

**Without API key:**
```json
{
  "error": "API key required",
  "message": "Sign in and create a project to get your API key",
  "signup_url": "https://app.docle.co/login"
}
```

### Domain Restrictions

Restrict API keys to specific domains for enhanced security.

**Supported formats:**
- `example.com` - Exact match
- `*.example.com` - Wildcard subdomain
- `app.example.com` - Specific subdomain

**How it works:**
1. Extract origin from `Origin` or `Referer` header
2. Check if origin hostname matches allowed domains
3. Block request if domain not in whitelist

**Example:**
```json
{
  "allowedDomains": ["app.docle.co", "*.docle.co", "localhost"]
}
```

Allows:
- ✅ `https://app.docle.co`
- ✅ `https://dashboard.docle.co` (wildcard match)
- ✅ `http://localhost:3000`

Blocks:
- ❌ `https://evil.com`
- ❌ `https://docle.com` (no wildcard, exact match failed)

### Revoking API Keys

Instantly disable compromised keys:

```bash
curl -X DELETE https://api.docle.co/api/keys/{key_id} \
  -H "Cookie: docle_session=YOUR_SESSION"
```

Revoked keys immediately return `401 Unauthorized` on all requests.

---

## Rate Limiting

Docle implements **two layers of rate limiting** to prevent abuse and control costs.

### Per-API-Key Rate Limiting

Each API key has a customizable rate limit (requests per minute).

**Configuration:**
- **Range:** 1 - 10,000 requests per minute
- **Default:** 60 req/min
- **Granularity:** Per minute (rolling window)
- **Storage:** KV store for distributed counting

**Rate Limit Headers:**

Every `/api/run` response includes:

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 55
X-RateLimit-Reset: 1735291380000
```

- `Limit` - Maximum requests per minute for this key
- `Remaining` - Requests left in current window
- `Reset` - Unix timestamp when limit resets (next minute)

**Example Response (Success):**
```bash
$ curl -i https://api.docle.co/api/run \
  -H "Authorization: Bearer sk_live_xxx" \
  -d '{"code":"print(1)","lang":"python"}'

HTTP/1.1 200 OK
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1735291380000

{
  "id": "run_abc123",
  "ok": true,
  "exitCode": 0,
  "stdout": "1\n"
}
```

**Example Response (Rate Limited):**
```bash
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1735291380000

{
  "error": "Rate limit exceeded",
  "message": "You have exceeded your rate limit of 60 requests per minute. Please try again in 30 seconds.",
  "limit": 60,
  "remaining": 0,
  "reset_at": 1735291380000
}
```

**Setting Rate Limits:**

When creating an API key, specify `rateLimitPerMinute`:

```json
{
  "name": "High-Volume Key",
  "rateLimitPerMinute": 1000
}
```

**Use Cases:**

| Limit | Use Case |
|-------|----------|
| **10/min** | Public demos, free tier, embedded playgrounds |
| **60/min** | Development, testing, light production usage |
| **300/min** | Standard production apps, typical SaaS usage |
| **1000/min** | High-volume apps, batch processing, enterprise |

**Best Practices:**
- Set lower limits for public/demo keys
- Use higher limits for trusted backend services
- Monitor `X-RateLimit-Remaining` header
- Implement exponential backoff when hitting limits
- Create separate keys for different environments

### IP-Based Rate Limiting

Protects unauthenticated endpoints from abuse (e.g., magic link requests).

**Limits:**
- **Magic Link Requests (`/auth/request`):** 5 per 15 minutes per IP
- **Purpose:** Prevent email bombing attacks
- **Detection:** Cloudflare `CF-Connecting-IP` header

**Example Response:**
```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again in 10 minutes.",
  "retry_after": 600
}
```

**Implementation:**
- Tracks requests per IP per time window
- Uses KV store: `ip_ratelimit:{action}:{ip}:{window}`
- Automatic cleanup after window expires
- Fail-safe: allows on error

---

## Per-User Rate Limiting

For SaaS applications with multiple users, implement per-user rate limiting in your server proxy to ensure fair usage and prevent one user from exhausting your API quota.

### Why Per-User Rate Limiting?

**Without per-user limits (per-key only):**
- All users share one API key's rate limit
- One abusive user affects everyone
- Hard to implement fair usage policies
- No user-specific quota management

**With per-user limits:**
- Each user gets their own quota
- Isolated limits - one user can't exhaust quota for others
- Better abuse prevention and scalability
- Support for tiered plans (free/pro/enterprise)

### Helper Package

Install the official rate limiting package:

```bash
npm install @doclehq/rate-limit ioredis
# or for edge/serverless
npm install @doclehq/rate-limit @upstash/redis
```

### Implementation with Redis

Production-ready implementation using Redis with sliding window algorithm:

```typescript
// lib/rate-limit.ts
import Redis from 'ioredis';
import { createRedisRateLimiter } from '@doclehq/rate-limit';

const redis = new Redis(process.env.REDIS_URL);
const limiter = createRedisRateLimiter(redis);

export async function checkUserRateLimit(userId: string) {
  return limiter.check({
    userId,
    limit: 100,      // 100 requests
    windowMs: 60000  // per minute
  });
}

// app/api/docle/route.ts (Next.js)
import { getServerSession } from 'next-auth';
import { checkUserRateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const { code, lang, policy } = await req.json();
  
  // Authenticate user
  const session = await getServerSession();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Check per-user rate limit
  const rateLimit = await checkUserRateLimit(session.user.id);
  
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
    body: JSON.stringify({ 
      code, 
      lang, 
      policy,
      userContext: {              // Track per-user in Docle
        id: session.user.id,
        email: session.user.email,
        tier: session.user.tier
      }
    })
  });
  
  return Response.json(await result.json(), {
    headers: {
      'X-RateLimit-Limit': rateLimit.limit.toString(),
      'X-RateLimit-Remaining': rateLimit.remaining.toString(),
      'X-RateLimit-Reset': rateLimit.reset.toISOString()
    }
  });
}
```

### Implementation with Upstash (Edge/Serverless)

Perfect for Vercel Edge Functions, Cloudflare Workers, and other serverless environments:

```typescript
// lib/rate-limit.ts
import { Redis } from '@upstash/redis';
import { createUpstashRateLimiter } from '@doclehq/rate-limit';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const limiter = createUpstashRateLimiter(redis);

// app/api/docle/route.ts
export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Check rate limit
  const rateLimit = await limiter.check({
    userId: session.user.id,
    limit: 100,
    windowMs: 60000
  });
  
  if (!rateLimit.success) {
    return Response.json({ 
      error: 'Rate limit exceeded',
      reset: rateLimit.reset
    }, { status: 429 });
  }
  
  // ... rest of proxy logic
}
```

### Implementation with In-Memory (Development)

For local development without Redis dependency:

```typescript
// lib/rate-limit.ts
import { createMemoryRateLimiter } from '@doclehq/rate-limit';

const limiter = createMemoryRateLimiter();

export async function checkUserRateLimit(userId: string) {
  return limiter.check({
    userId,
    limit: 100,
    windowMs: 60000
  });
}
```

**⚠️ Warning:** In-memory limiter is for development only. Data is lost on process restart and not shared across instances.

### Tiered Rate Limiting

Different limits for different user subscription tiers:

```typescript
import { createTieredRateLimiter, createRedisRateLimiter } from '@doclehq/rate-limit';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);
const baseLimiter = createRedisRateLimiter(redis);

const limiter = createTieredRateLimiter(baseLimiter, {
  free: { requests: 100, windowMs: 60000 },       // 100/min
  pro: { requests: 1000, windowMs: 60000 },       // 1000/min
  enterprise: { requests: 10000, windowMs: 60000 } // 10000/min
});

// In your API route
export async function POST(req: Request) {
  const session = await getServerSession();
  
  const rateLimit = await limiter.check({
    userId: session.user.id,
    tier: session.user.tier || 'free'
  });
  
  if (!rateLimit.success) {
    return Response.json({ 
      error: 'Rate limit exceeded',
      upgrade_url: '/pricing' // Prompt upgrade
    }, { status: 429 });
  }
  
  // ... rest of logic
}
```

### Manual Implementation (Without Package)

If you prefer to implement rate limiting yourself:

```typescript
// lib/rate-limit.ts
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function checkUserRateLimit({
  userId,
  limit = 100,
  windowMs = 60000
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
```

### Rate Limit Headers

Return standard rate limit headers to clients:

```typescript
import { createRateLimitHeaders } from '@doclehq/rate-limit';

const rateLimit = await limiter.check({ userId: 'user_123' });
const headers = createRateLimitHeaders(rateLimit);

return Response.json(data, { headers });
// X-RateLimit-Limit: 100
// X-RateLimit-Remaining: 95
// X-RateLimit-Reset: 2025-01-27T12:00:00.000Z
```

### Next.js Middleware

Apply rate limiting to all API routes using middleware:

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createRedisRateLimiter, createRateLimitHeaders } from '@doclehq/rate-limit';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);
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

### See Also

- **[@doclehq/rate-limit README](packages/rate-limit/README.md)** - Full API documentation
- **[User Context Tracking](#user-context-tracking)** - Track per-user usage in Docle
- **[Usage Analytics](#usage-analytics)** - View per-user analytics in dashboard

---

## User Context Tracking

Track which users are running code by passing optional `userContext` to Docle's API. This enables per-user analytics in your dashboard and better debugging.

### Schema

```typescript
interface UserContext {
  id: string;                              // Required: User identifier
  email?: string;                          // Optional: For display
  name?: string;                           // Optional: For display
  tier?: 'free' | 'pro' | 'enterprise';    // Optional: For analytics
  metadata?: Record<string, unknown>;      // Optional: Custom data
}
```

### Backend API

Pass `userContext` when calling Docle's API:

```typescript
// Server proxy
const result = await fetch('https://api.docle.co/api/run', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.DOCLE_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    code,
    lang,
    policy: { timeoutMs: 5000 },
    userContext: {                         // NEW: Optional user context
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      tier: session.user.tier,
      metadata: {
        orgId: session.user.orgId,
        source: 'web-app'
      }
    }
  })
});
```

### SDK

Using `@doclehq/sdk`:

```typescript
import { runSandbox } from '@doclehq/sdk';

const result = await runSandbox(code, {
  lang: 'python',
  apiKey: process.env.DOCLE_API_KEY,
  userContext: {
    id: session.user.id,
    email: session.user.email,
    tier: session.user.tier
  }
});
```

### React

Using `@doclehq/react`:

```tsx
import { useDocle } from '@doclehq/react';

function MyEditor() {
  const session = useSession();
  
  const { run, result, loading } = useDocle({
    endpoint: '/api/docle',
    userContext: {
      id: session.user.id,
      email: session.user.email,
      tier: session.user.tier
    }
  });
  
  // Or pass per-execution:
  await run(code, {
    lang: 'python',
    userContext: { id: 'user_123' }
  });
}
```

### Vue

Using `@doclehq/vue`:

```vue
<script setup>
import { useDocle } from '@doclehq/vue';

const session = useAuth();

const { run, result, loading } = useDocle({
  endpoint: '/api/docle',
  userContext: {
    id: session.user.id,
    email: session.user.email,
    tier: session.user.tier
  }
});
</script>
```

### Benefits

- **Per-user analytics** - See which users are running code in your dashboard
- **Better debugging** - Track execution history per user
- **Usage insights** - Identify power users and usage patterns
- **Tiered limits** - Combine with per-user rate limiting for fair usage
- **Compliance** - Audit trails for security and compliance

### Privacy

- `userContext` is optional and not required for code execution
- Data is stored only for analytics and debugging
- You control what data to send (e.g., hashed IDs for privacy)
- Fully backward compatible - existing code works without changes

---

## Usage Analytics

Track detailed execution metrics for each project.

### Metrics Tracked

**Per Execution:**
- Language (Python/Node.js)
- Code snippet (truncated)
- Status (success/error)
- Exit code
- Execution time (milliseconds)
- IP address (optional)
- Timestamp

**Aggregated:**
- Total runs
- Language breakdown
- Success rate percentage
- Execution history (last 50 runs)

### Viewing Analytics

**Dashboard:** Navigate to project → "Usage" tab

**API Endpoint:**
```bash
curl https://api.docle.co/api/projects/{project_id}/usage \
  -H "Cookie: docle_session=YOUR_SESSION"
```

**Response:**
```json
{
  "total_runs": 1250,
  "python_runs": 800,
  "nodejs_runs": 450,
  "success_rate": 94.5,
  "history": [
    {
      "id": "run_abc123",
      "language": "python",
      "code_snippet": "print('Hello, World!')",
      "status": "success",
      "exit_code": 0,
      "execution_time_ms": 45,
      "created_at": "2025-10-27T12:30:00.000Z"
    },
    // ... more runs
  ]
}
```

### Usage by API Key

Track which keys are being used most:

```bash
curl https://api.docle.co/api/projects/{project_id}/keys \
  -H "Cookie: docle_session=YOUR_SESSION"
```

**Response includes:**
```json
{
  "apiKeys": [
    {
      "id": "key_xyz789",
      "name": "Production",
      "key_prefix": "sk_live_abc1",
      "rate_limit_per_minute": 300,
      "last_used_at": "2025-10-27T12:35:00.000Z",
      "is_active": 1,
      "created_at": "2025-10-20T10:00:00.000Z"
    }
  ]
}
```

---

## REST API Reference

### Base URL

```
Production: https://api.docle.co
Local: http://localhost:8787
```

### POST /api/run

Execute code in a secure sandbox.

#### Request Body

```typescript
{
  // Single-file mode
  "code"?: string;
  
  // Multi-file mode
  "files"?: Array<{
    path: string;      // e.g., "main.py", "utils/helper.js"
    content: string;
  }>;
  
  // Specify entry point for multi-file projects
  "entrypoint"?: string;  // e.g., "main.py" (defaults to main.py/main.js)
  
  // Install packages before execution
  "packages"?: {
    packages: string[];  // e.g., ["requests", "pandas==2.0.0"]
  };
  
  // Required
  "lang": "python" | "node";
  
  // Execution policy (all optional)
  "policy"?: {
    timeoutMs?: number;    // 100-300000, default: 3000
  }
}
```

#### Response

```typescript
{
  "id": string;           // Unique execution ID
  "ok": boolean;          // true if exitCode === 0
  "exitCode": number;     // Process exit code
  "stdout": string;       // Standard output
  "stderr": string;       // Standard error
  "usage": {
    "cpuMs"?: number;     // CPU time used
    "memMB"?: number;     // Memory used
    "durationMs"?: number; // Total execution time
  };
  "createdAt": string;    // ISO 8601 timestamp
}
```

#### Example: Simple Python Execution

```bash
curl -X POST https://api.docle.co/api/run \
  -H "Content-Type: application/json" \
  -d '{
    "code": "print(\"Hello, Docle!\")\nfor i in range(3):\n    print(f\"Count: {i}\")",
    "lang": "python",
    "policy": {
      "timeoutMs": 5000,
    }
  }'
```

#### Example: Multi-File Python Project

```bash
curl -X POST https://api.docle.co/api/run \
  -H "Content-Type: application/json" \
  -d '{
    "files": [
      {
        "path": "main.py",
        "content": "from calculator import add\nresult = add(5, 3)\nprint(f\"Result: {result}\")"
      },
      {
        "path": "calculator.py",
        "content": "def add(a, b):\n    return a + b"
      }
    ],
    "entrypoint": "main.py",
    "lang": "python",
    "policy": { "timeoutMs": 10000 }
  }'
```

#### Example: Node.js with Packages

```bash
curl -X POST https://api.docle.co/api/run \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const _ = require(\"lodash\");\nconsole.log(_.chunk([1,2,3,4,5,6], 2));",
    "lang": "node",
    "packages": {
      "packages": ["lodash@4.17.21"]
    },
    "policy": {
      "timeoutMs": 30000
    }
  }'
```

### GET /api/run/:id

Retrieve a previous execution result by ID.

#### Response

Same format as POST /api/run response.

#### Example

```bash
curl https://api.docle.co/api/run/550e8400-e29b-41d4-a716-446655440000
```

---

## SDK & Framework Packages

All packages are published on npm under the `@doclehq` organization.

###  @doclehq/sdk

Pure TypeScript SDK for programmatic code execution (no UI).

**Installation:**

```bash
npm install @doclehq/sdk
```

**Usage:**

```typescript
import { runSandbox } from '@doclehq/sdk';

const result = await runSandbox('print("Hello, Docle!")', {
  lang: 'python',
  policy: {
    timeoutMs: 5000,
  },
  endpoint: 'https://api.docle.co' // optional
});

console.log(result.stdout); // "Hello, Docle!"
console.log(result.ok);      // true
console.log(result.exitCode); // 0
```

**Multi-File Example:**

```typescript
import { runSandbox } from '@doclehq/sdk';

const result = await runSandbox('', {
  lang: 'python',
  files: [
    { path: 'main.py', content: 'from utils import greet\ngreet("World")' },
    { path: 'utils.py', content: 'def greet(name):\n    print(f"Hello, {name}!")' }
  ],
  entrypoint: 'main.py',
  policy: { timeoutMs: 10000 }
});
```

[Full SDK Documentation →](sdk/README.md)

### @doclehq/react

React components and hooks for embedded code execution.

**Installation:**

```bash
npm install @doclehq/react
```

**Component Usage:**

```tsx
import { DoclePlayground } from '@doclehq/react';

function App() {
  return (
    <DoclePlayground
      lang="python"
      code="print('Hello, React!')"
      theme="dark"
      height="500px"
      autorun={false}
      onRun={(result) => {
        console.log('Execution completed:', result);
      }}
      onError={(error) => {
        console.error('Execution failed:', error);
      }}
    />
  );
}
```

**Headless Hook (useDocle):**

```tsx
import { useDocle } from '@doclehq/react';
import { useState } from 'react';

function CustomEditor() {
  const { run, result, loading, error, reset } = useDocle({
    endpoint: 'https://api.docle.co'
  });
  const [code, setCode] = useState('print("Hello!")');

  const handleRun = async () => {
    await run(code, { 
      lang: 'python',
      policy: { timeoutMs: 5000 }
    });
  };

  return (
    <div>
      <textarea value={code} onChange={(e) => setCode(e.target.value)} />
      <button onClick={handleRun} disabled={loading}>
        {loading ? 'Running...' : 'Run Code'}
      </button>
      {result && <pre>{result.stdout}</pre>}
      {error && <div>Error: {error.message}</div>}
    </div>
  );
}
```

[Full React Documentation →](packages/react/README.md)

### @doclehq/vue

Vue 3 components and composables for embedded code execution.

**Installation:**

```bash
npm install @doclehq/vue
```

**Component Usage:**

```vue
<script setup>
import { DoclePlayground } from '@doclehq/vue';

const handleReady = (data) => {
  console.log('Playground ready:', data);
};

const handleRun = (result) => {
  console.log('Code executed:', result);
};

const handleError = (error) => {
  console.error('Execution error:', error);
};
</script>

<template>
  <DoclePlayground
    lang="python"
    code="print('Hello, Vue!')"
    theme="dark"
    height="500px"
    :readonly="false"
    @ready="handleReady"
    @run="handleRun"
    @error="handleError"
  />
</template>
```

**Composable (useDocle):**

```vue
<script setup>
import { ref } from 'vue';
import { useDocle } from '@doclehq/vue';

const { run, result, loading, error } = useDocle();
const code = ref('print("Hello from Vue!")');

const handleRun = async () => {
  await run(code.value, {
    lang: 'python',
    policy: {
      timeoutMs: 5000,
    }
  });
};
</script>

<template>
  <div>
    <textarea v-model="code" />
    <button @click="handleRun" :disabled="loading">
      {{ loading ? 'Running...' : 'Run Code' }}
    </button>
    
    <div v-if="result">
      <h3>Output:</h3>
      <pre>{{ result.stdout }}</pre>
    </div>
    
    <div v-if="error" class="error">
      Error: {{ error.message }}
    </div>
  </div>
</template>
```

[Full Vue Documentation →](packages/vue/README.md)

---

## Embeddable Components

Add interactive code playgrounds to any website with zero configuration.

### CDN Embed (Recommended)

The simplest way to add code execution to any website.

```html
<!-- Option 1: Load from unpkg CDN (Recommended) -->
<script src="https://unpkg.com/@doclehq/embed@latest/dist/embed.js"></script>

<!-- Option 2: Load from your Worker -->
<script src="https://api.docle.co/embed.js"></script>

<!-- Use anywhere -->
<div data-docle data-lang="python">
print("Hello, Docle!")
for i in range(5):
    print(f"Count: {i}")
</div>
```

**Options:**

- `data-lang` - `python` | `node` (default: `python`)
- `data-theme` - `dark` | `light` (default: `dark`)
- `data-code` - Initial code (overrides element content)
- `data-readonly` - `true` | `false` (default: `false`)
- `data-height` - Custom height (e.g., `300px`, default: `400px`)
- `data-autorun` - `true` | `false` (default: `false`)

### iframe Embed

For more control, embed via iframe:

```html
<iframe 
  src="https://api.docle.co/embed?lang=python&code=print('Hello')"
  width="100%" 
  height="400px"
  frameborder="0"
></iframe>
```

**Query Parameters:**

- `lang` - `python` | `node`
- `theme` - `dark` | `light`
- `code` - Initial code (URL-encoded)
- `readonly` - `true` | `false`
- `autorun` - `true` | `false`

### PostMessage API

Control embedded iframes programmatically:

```javascript
// Listen to execution results
window.addEventListener('message', (e) => {
  if (e.data.type === 'docle-result') {
    console.log('Execution result:', e.data.data);
  }
  
  if (e.data.type === 'docle-ready') {
    console.log('Playground ready');
  }
  
  if (e.data.type === 'docle-error') {
    console.error('Execution error:', e.data.error);
  }
});

// Control the embed
const iframe = document.querySelector('iframe');

// Run code
iframe.contentWindow.postMessage({ type: 'docle-run' }, '*');

// Set new code
iframe.contentWindow.postMessage({ 
  type: 'docle-set-code', 
  code: 'print("Updated code!")' 
}, '*');

// Change language
iframe.contentWindow.postMessage({
  type: 'docle-set-lang',
  lang: 'node'
}, '*');
```

---

## Security & Sandboxing

Docle uses [Cloudflare Sandbox](https://developers.cloudflare.com/sandbox/) - a secure V8 isolate-based execution environment.

###  How Isolation Works

1. **V8 Isolates** - Each execution runs in a separate V8 isolate
2. **No Network Access** - Network disabled by default (configurable)
3. **No Filesystem Access** - Only sandbox workspace is accessible
4. **Resource Limits** - Configurable timeout and memory limits
5. **Process Isolation** - Execution cannot access Workers runtime or other executions

### What's Blocked

- ❌ Access to environment variables
- ❌ Access to file system (outside workspace)
- ❌ Network requests
- ❌ System calls
- ❌ Access to other executions
- ❌ Access to Workers bindings (KV, DO, R2, etc.)

### What's Allowed

- ✅ Full Python standard library
- ✅ Full Node.js standard library
- ✅ Third-party packages (pip/npm)
- ✅ File operations within `/workspace`
- ✅ Multi-file project execution

### Security Best Practices

1. **Always use timeouts** - Prevent infinite loops
2. **Limit memory** - Prevent memory exhaustion
3. **Disable network** - Unless absolutely necessary
4. **Validate output** - Sanitize stdout/stderr before displaying
5. **Rate limiting** - Implement on your end if needed

---

## Execution Policies

Fine-grained control over execution environment.

### Policy Options

```typescript
{
  timeoutMs: number;    // 100 - 300,000 (5 minutes)
}
```

### Timeout (timeoutMs)

Controls maximum execution time.

- **Minimum:** 100ms
- **Maximum:** 300,000ms (5 minutes)
- **Default:** 3,000ms (3 seconds)
- **Exit Code on Timeout:** 124

**Example:**

```javascript
{
  "policy": {
    "timeoutMs": 10000  // 10 seconds
  }
}
```

### Recommended Policies by Use Case

**Quick Scripts (default):**
```javascript
{ timeoutMs: 3000 }
```

**Data Processing:**
```javascript
{ timeoutMs: 30000 }
```

**API Calls:**
```javascript
{ timeoutMs: 15000 }
```

**Heavy Computation:**
```javascript
{ timeoutMs: 60000 }
```

**Educational/Untrusted Code:**
```javascript
{ timeoutMs: 5000 }
```

---

## Storage & History

Docle stores execution history in Cloudflare KV for retrieval and replay.

### Automatic Storage

Every execution is automatically saved with:
- Unique execution ID (UUID)
- Complete input (code, policy, language)
- Complete output (stdout, stderr, exit code)
- Execution metadata (duration, timestamp)
- **Retention:** 7 days

### Retrieving History

```bash
# Get execution by ID
curl https://api.docle.co/api/run/{execution-id}
```

```typescript
// Using SDK
import { runSandbox } from '@doclehq/sdk';

const result = await runSandbox('print("Hello")', { lang: 'python' });
console.log(result.id); // "550e8400-e29b-41d4-a716-446655440000"

// Later, retrieve the same execution
const historicalResult = await fetch(`https://api.docle.co/api/run/${result.id}`)
  .then(r => r.json());
```

### Local Storage (Playground)

The playground UI also stores executions locally:
- **Storage:** Browser localStorage
- **Limit:** Last 50 executions
- **Persistence:** Until cleared by user
- **Features:** Quick replay, code templates

---

## Dashboard UI

Docle provides a modern, production-ready dashboard built with **Nuxt.js** and **Tailwind CSS**.

### Pages

#### Login (`/login`)
- **Magic link authentication**
- **Email input** with validation
- **Sleek dark theme** with purple-blue gradients
- **IP rate-limited** (5 requests per 15 min)

#### Dashboard (`/`)
- **Project overview** - All your projects
- **Create new projects** - Quick action button
- **Project cards** - Name, ID, creation date
- **Empty state** - Helpful quick start guide
- **Modern dark theme** - Consistent brand identity

#### Playground (`/playground`)
- **Live code editor** with syntax highlighting (Monaco)
- **Language selector** - Python & Node.js
- **Multi-file mode** - File tree navigation
- **Package management** - Add npm/pip packages
- **Run output** - stdout/stderr display
- **Execution history** - Recent runs
- **Collaboration mode** - Real-time editing (WebSocket)
- **Auto-generated API key** - Seamless authenticated execution
- **Auth required** - Redirects to login if not signed in

#### Project Details (`/projects/[id]`)
- **Breadcrumb navigation** - Dashboard → Projects → [Name]
- **Two tabs:**
  - **API Keys** - Generate, view, revoke keys
  - **Usage** - Analytics and execution history
- **Generate key modal** with:
  - Custom name input
  - Domain restrictions (multiple domains supported)
  - Rate limit selector (presets: 10, 60, 300, 1000/min)
- **Key list** showing:
  - Name, prefix, status (active/revoked)
  - Rate limit (e.g., "60 req/min")
  - Creation date, last used
  - Revoke button
- **Usage stats cards:**
  - Total runs
  - Python runs
  - Node.js runs
  - Success rate
- **Execution history table:**
  - Time, language, code snippet
  - Status, exit code, duration

#### Snippets (`/snippets`)
- **Multiple integration examples:**
  - CDN (script tag)
  - React component
  - Vue component
  - iframe embedding
  - TypeScript SDK
- **Live preview** - Interactive demo
- **Copy to clipboard** - One-click code copying
- **Syntax highlighting** - Color-coded examples
- **Installation instructions** - Step-by-step guides
- **Auth required** - Sign in to view

#### Embed Page (`/embed`)
- **Minimal playground** for iframe embedding
- **URL parameters** - lang, code, theme, readonly, autorun
- **postMessage API** - Parent-child communication
- **Secure API key** - Passed from parent via postMessage
- **Read-only mode** - Display-only execution
- **Auto-run** - Execute on load
- **Public access** - No auth required (security via API key)

### Features

#### Authentication Guard
- All protected routes check authentication status
- Redirects to `/login` if not authenticated
- Session stored in HttpOnly cookie
- 30-day expiration

#### User Dropdown
- Shows user email
- Sign out button
- Appears on all authenticated pages
- Avatar with user initials

#### Responsive Design
- Mobile-friendly layouts
- Tailwind CSS utility classes
- Dark theme throughout
- Purple-to-blue gradient accents

#### Error Handling
- Toast notifications for errors
- Loading states for async operations
- Empty states with helpful CTAs
- Graceful fallbacks

### Navigation

```
/                 → Dashboard (home)
/login            → Magic link auth
/playground       → Code playground (auth required)
/snippets         → Integration examples (auth required)
/projects/[id]    → Project details (auth required)
/embed            → Minimal embed page (public)
```

### UI Components

**Reusable:**
- `AppHeader` - Navigation header with auth status
- Loading spinners - Gradient dual-ring animation
- Modals - Dark themed with blur backdrop
- Buttons - Primary (purple-blue gradient), secondary (gray)
- Cards - Dark with subtle borders
- Forms - Dark inputs with focus states

**Styling:**
- **Colors:** Black background, gray borders, purple-blue accents
- **Typography:** Sans-serif, clear hierarchy
- **Spacing:** Generous padding, consistent margins
- **Animations:** Smooth transitions, hover effects

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        User Request                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Cloudflare Worker (Hono)                   │
│  • Request validation (Zod schemas)                          │
│  • Policy enforcement                                        │
│  • Session management                                        │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│   Cloudflare Sandbox     │  │   Cloudflare KV          │
│   (V8 Isolate)           │  │   (Storage)              │
│                          │  │                          │
│  • Python 3.x runtime    │  │  • Execution history     │
│  • Node.js runtime       │  │  • 7-day retention       │
│  • Package installation  │  │  • UUID-based keys       │
│  • Multi-file execution  │  │                          │
│  • Network isolation     │  │                          │
└──────────────────────────┘  └──────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                      Execution Result                        │
│  { stdout, stderr, exitCode, usage, id, timestamp }          │
└─────────────────────────────────────────────────────────────┘
```

### Collaborative Editing Architecture

```
┌──────────────┐          WebSocket          ┌──────────────────┐
│   Client 1   │◄───────────────────────────►│                  │
└──────────────┘                              │  Cloudflare      │
                                              │  Worker          │
┌──────────────┐          WebSocket          │  (Router)        │
│   Client 2   │◄───────────────────────────►│                  │
└──────────────┘                              └────────┬─────────┘
                                                       │
┌──────────────┐          WebSocket                   │
│   Client N   │◄───────────────────────────────────► │
└──────────────┘                                       │
                                                       ▼
                                              ┌──────────────────┐
                                              │  Durable Object  │
                                              │  (Session State) │
                                              │                  │
                                              │  • Code state    │
                                              │  • User presence │
                                              │  • Broadcast     │
                                              └────────┬─────────┘
                                                       │
                                                       ▼
                                              ┌──────────────────┐
                                              │  KV Storage      │
                                              │  (Persistence)   │
                                              └──────────────────┘
```

### Tech Stack

- **Runtime:** [Cloudflare Workers](https://workers.cloudflare.com/)
- **Framework:** [Hono](https://hono.dev/) (lightweight web framework)
- **Sandbox:** [Cloudflare Sandbox](https://developers.cloudflare.com/sandbox/)
- **Storage:** [Cloudflare KV](https://developers.cloudflare.com/kv/)
- **Real-time:** [Durable Objects](https://developers.cloudflare.com/durable-objects/)
- **Validation:** [Zod](https://zod.dev/) (TypeScript schema validation)
- **Editor:** [CodeMirror 6](https://codemirror.net/)

---

## Use Cases

### 1. Educational Platforms

Build interactive coding courses and tutorials.

**Features you need:**
- Syntax highlighting ✓
- Execution history ✓
- Read-only mode ✓
- Pre-filled exercises ✓

**Example:**

```tsx
<DoclePlayground
  lang="python"
  code="# TODO: Complete the function\ndef add(a, b):\n    pass"
  onRun={(result) => {
    if (result.stdout.includes("8")) {
      showSuccess("Correct!");
    }
  }}
/>
```

### 2. Live Code Interviews

Run technical interviews with real-time code execution.

**Features you need:**
- Collaborative editing ✓
- Real-time sync ✓
- Execution tracking ✓

**Example:**

```
https://api.docle.co/collab/interview-session-123
```

### 3. AI Agents with Code Execution

Give your AI agents the ability to write and execute code.

**Features you need:**
- REST API ✓
- Package installation ✓
- Network access (optional) ✓
- Fast execution ✓

**Example:**

```python
# AI agent workflow
user_query = "Fetch weather for San Francisco"
ai_generates_code = generate_code(user_query)
result = await runSandbox(ai_generated_code, {
  lang: 'python',
  packages: { packages: ['requests'] },
  policy: { timeoutMs: 10000 }
})
show_result_to_user(result.stdout)
```

### 4. SaaS Plugin Systems

Let users write custom logic for your platform.

**Features you need:**
- Secure isolation ✓
- Custom policies ✓
- Multi-file projects ✓

### 5. Code Playgrounds

Build interactive documentation or demo sites.

**Features you need:**
- CDN embed ✓
- Beautiful UI ✓
- Framework components ✓

### 6. API Testing Tools

Execute API requests and process responses.

**Features you need:**
- Network access ✓
- Package installation ✓
- JSON processing ✓

---

## Deployment Guide

### Local Development

```bash
# Clone repository
git clone https://github.com/kagehq/docle.git
cd docle

# Install dependencies
npm install
cd playground && npm install && cd ..

# Start both servers (API + Playground)
./start.sh
```

**URLs:**
- API: http://localhost:8787
- Playground: http://localhost:3001

**Note:** Cloudflare Sandbox only works in production. Local dev uses simulation mode.

### Production Deployment

#### Prerequisites

1. [Cloudflare account](https://dash.cloudflare.com/sign-up)
2. **Workers Paid Plan** ($5/month) - Required for:
   - Cloudflare Sandbox
   - Durable Objects (collaborative editing)
   - Extended CPU time

#### Step 1: Create KV Namespaces

```bash
# Production
npx wrangler kv namespace create RUNS

# Preview (for testing)
npx wrangler kv namespace create RUNS --preview
```

Copy the generated IDs.

#### Step 2: Update wrangler.toml

```toml
[[kv_namespaces]]
binding = "RUNS"
id = "YOUR_PRODUCTION_ID"
preview_id = "YOUR_PREVIEW_ID"
```

#### Step 3: Enable Sandbox

In `src/index.ts`, uncomment:

```typescript
export { Sandbox } from '@cloudflare/sandbox';
```

#### Step 4: Deploy

```bash
npm run deploy
```

Your worker will be live at:
```
https://docle.YOUR-SUBDOMAIN.workers.dev
```

#### Step 5: Custom Domain (Optional)

1. Go to Workers Dashboard
2. Navigate to your worker
3. Click "Triggers" → "Custom Domains"
4. Add your domain (e.g., `api.your domain.com`)

### Environment Variables

Set via `wrangler.toml` or Cloudflare Dashboard:

```toml
[vars]
ENVIRONMENT = "production"
MAX_TIMEOUT_MS = "300000"
```

### Monitoring

View logs and metrics in the Cloudflare Dashboard:

1. Workers & Pages
2. Select your worker
3. Logs tab (real-time logs)
4. Analytics tab (usage metrics)

---

## Performance & Limits

### Execution Performance

- **Cold start:** ~50-100ms
- **Warm execution:** ~20-50ms
- **Package installation:** 5-30 seconds (cached after first install)
- **Network latency:** <50ms (Cloudflare edge network)

### Cloudflare Workers Limits

**Free Plan:**
- 100,000 requests/day
- 10ms CPU time per request
- ❌ No Sandbox access
- ❌ No Durable Objects

**Paid Plan ($5/month):**
- 10 million requests/month
- 50ms CPU time per request
- ✅ Sandbox access
- ✅ Durable Objects
- ✅ Extended resources

### Sandbox Limits

- **Max execution time:** 300 seconds (5 minutes)
- **Max memory:** 2048 MB (2 GB)
- **Max file size:** 100 MB per file
- **Max files:** 1000 files per execution

### Storage Limits

**KV (Execution History):**
- **Max key size:** 512 bytes
- **Max value size:** 25 MB
- **Retention:** 7 days (configurable)
- **Read latency:** <10ms (edge cache)

**Durable Objects (Collaboration):**
- **Max connections:** 10,000 per object
- **Max state size:** 128 MB
- **Persistence:** Automatic

### Rate Limiting

Docle does not enforce rate limiting by default. Implement on your end:

```typescript
// Example: Cloudflare Rate Limiting
// Configure in Cloudflare Dashboard under Security → WAF
```

---

## Multi-File Projects

Execute complete projects with multiple files and custom entry points.

### Python Multi-File Example

```json
{
  "files": [
    {
      "path": "main.py",
      "content": "from models.user import User\nfrom utils.logger import log\n\nuser = User('Alice', 30)\nlog(user.greet())"
    },
    {
      "path": "models/user.py",
      "content": "class User:\n    def __init__(self, name, age):\n        self.name = name\n        self.age = age\n    \n    def greet(self):\n        return f'Hello, I am {self.name}, {self.age} years old'"
    },
    {
      "path": "utils/logger.py",
      "content": "def log(message):\n    print(f'[LOG] {message}')"
    }
  ],
  "entrypoint": "main.py",
  "lang": "python",
  "policy": { "timeoutMs": 5000 }
}
```

### Node.js Multi-File Example

```json
{
  "files": [
    {
      "path": "main.js",
      "content": "const { calculate } = require('./calculator');\nconst result = calculate(10, 5);\nconsole.log(`Result: ${result}`);"
    },
    {
      "path": "calculator.js",
      "content": "function calculate(a, b) {\n  return a + b;\n}\n\nmodule.exports = { calculate };"
    }
  ],
  "entrypoint": "main.js",
  "lang": "node",
  "policy": { "timeoutMs": 5000 }
}
```

### File Organization

- Files are written to `/workspace/`
- Imports work relative to workspace root
- Subdirectories supported (e.g., `models/user.py`)
- Entry point defaults to `main.py` or `main.js`

---

## Package Installation

Install third-party packages before execution.

### Python Packages

```json
{
  "code": "import pandas as pd\nimport requests\n\ndf = pd.DataFrame({'a': [1, 2, 3]})\nprint(df)",
  "lang": "python",
  "packages": {
    "packages": ["pandas==2.0.0", "requests"]
  },
  "policy": {
    "timeoutMs": 60000  // Allow time for installation
  }
}
```

**Supported formats:**
- `package-name` (latest version)
- `package-name==1.2.3` (specific version)
- `package-name>=1.0.0` (version constraint)

### Node.js Packages

```json
{
  "code": "const express = require('express');\nconst app = express();\nconsole.log('Express loaded!');",
  "lang": "node",
  "packages": {
    "packages": ["express@4.18.0", "lodash"]
  },
  "policy": {
    "timeoutMs": 60000
  }
}
```

**Supported formats:**
- `package-name` (latest)
- `package-name@1.2.3` (specific version)
- `@scope/package-name` (scoped packages)

### Installation Process

1. Creates `requirements.txt` (Python) or `package.json` (Node)
2. Runs `pip3 install` or `npm install`
3. If installation fails, returns error without running code
4. Installation timeout: 60 seconds max
5. Packages cached within session

### Common Packages

**Python:**
- requests (HTTP client)
- pandas (data analysis)
- numpy (numerical computing)
- beautifulsoup4 (web scraping)
- Pillow (image processing)

**Node.js:**
- express (web framework)
- lodash (utility library)
- axios (HTTP client)
- moment (date/time)
- cheerio (HTML parsing)

---

## Collaborative Editing

Real-time multi-user code editing powered by Durable Objects and WebSockets.

### Creating a Session

```bash
# Visit the collab playground
https://api.docle.co/collab

# You'll be redirected to a unique session URL
https://api.docle.co/collab/abc-123-def

# Share this URL with collaborators
```

### Features

- ✅ Real-time code synchronization
- ✅ User presence indicators
- ✅ Color-coded cursors
- ✅ Automatic reconnection
- ✅ Session-based URLs (shareable)
- ✅ Last-write-wins conflict resolution
- ✅ 10+ concurrent users per session

### WebSocket API

**Connect to session:**

```javascript
const sessionId = 'abc-123-def';
const ws = new WebSocket(`wss://docle.onboardbase.workers.dev/collab/${sessionId}/websocket`);

ws.onopen = () => {
  console.log('Connected to session');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Message:', message);
};
```

**Message Types (Client → Server):**

```typescript
// Update code
{
  type: 'update',
  userId: 'user-123',
  data: {
    code: 'print("Hello")',
    lang: 'python'
  }
}

// Update cursor position
{
  type: 'cursor',
  userId: 'user-123',
  data: { cursor: 42 }
}

// Request full state sync
{
  type: 'sync'
}
```

**Message Types (Server → Client):**

```typescript
// Initial state when connecting
{
  type: 'init',
  userId: 'user-123',
  data: {
    code: 'print("Hello")',
    lang: 'python',
    users: [...]
  }
}

// User joined
{
  type: 'join',
  userId: 'user-456',
  data: {
    name: 'Alice',
    color: '#ff6b6b'
  }
}

// User left
{
  type: 'leave',
  userId: 'user-456'
}

// Code updated by another user
{
  type: 'update',
  userId: 'user-456',
  data: {
    code: 'print("Updated!")',
    lang: 'python'
  },
  timestamp: 1234567890
}
```

### Session State Endpoint

Get current session state via HTTP:

```bash
curl https://api.docle.co/collab/abc-123-def/state
```

Response:

```json
{
  "code": "print('Hello')",
  "lang": "python",
  "users": [
    { "id": "user-123", "name": "Alice", "color": "#ff6b6b" },
    { "id": "user-456", "name": "Bob", "color": "#51cf66" }
  ],
  "lastUpdate": 1234567890
}
```

### Deployment Requirements

Collaborative editing requires:
1. **Durable Objects** binding in `wrangler.toml`
2. **Workers Paid Plan** ($5/month)
3. Production deployment (limited support in local dev)

---

## Troubleshooting

### Common Issues

#### 1. Sandbox Not Available (Local Dev)

**Issue:** Code doesn't execute, shows preview mode

**Cause:** Cloudflare Sandbox only works in production

**Solution:**
- Deploy to Cloudflare Workers: `npm run deploy`
- OR accept simulation mode for local development

#### 2. Package Installation Fails

**Issue:** `Package installation failed: ...`

**Solutions:**
- Check package name spelling
- Increase `timeoutMs` to 60000+ (60 seconds)
- Use specific versions: `requests==2.31.0`

**Example:**

```json
{
  "packages": { "packages": ["requests==2.31.0"] },
  "policy": {
    "timeoutMs": 60000
  }
}
```

#### 3. Timeout Errors

**Issue:** `SandboxError: Timeout` or exit code 124

**Solutions:**
- Increase `timeoutMs` in policy
- Optimize code (remove infinite loops)
- Check if code is waiting on network/file operations

#### 4. Network Request Fails

**Issue:** Code can't make HTTP requests

**Solution:** Enable network access:

```json
{
  "policy": {
    "timeoutMs": 15000  // Allow time for operations
  }
}
```

#### 5. Collaborative Editing Not Working

**Issue:** "Collaborative editing not available"

**Solutions:**
1. Verify `wrangler.toml` has Durable Objects binding:
```toml
[[durable_objects.bindings]]
name = "COLLAB_SESSION"
class_name = "CollabSession"
```
2. Deploy to production (not `--local`)
3. Verify Workers Paid plan is active

#### 6. Memory Limit Exceeded

**Issue:** Code crashes or returns empty output

**Solution:** Increase memory limit:

```json
{
  "policy": {
    "timeoutMs": 30000  // Increase timeout for heavy operations
  }
}
```

#### 7. Import Errors (Multi-File)

**Issue:** `ModuleNotFoundError` or `Cannot find module`

**Solutions:**
- Check file paths are correct
- Use correct import syntax for language
- Verify entrypoint is specified
- Check file structure matches imports

**Python:**
```python
# If files are: main.py, utils/helper.py
from utils.helper import function_name
```

**Node.js:**
```javascript
// If files are: main.js, utils/helper.js
const { functionName } = require('./utils/helper');
```

### Getting Help

- **Documentation:** https://github.com/kagehq/docle
- **Issues:** https://github.com/kagehq/docle/issues
- **Cloudflare Sandbox Docs:** https://developers.cloudflare.com/sandbox/

---

## Advanced Editor Features

The playground includes a professional code editor powered by CodeMirror 6.

### Features

- **Syntax Highlighting** - Python and JavaScript
- **Auto-Indentation** - Smart code formatting
- **Line Numbers** - Easy navigation
- **Code Folding** - Collapse code blocks
- **Dark Theme** - Optimized for readability
- **Keyboard Shortcuts** - Efficient editing

### Available Playgrounds

**Simple Playground (`/playground`):**
- Single-file editor
- Syntax highlighting
- Execution history
- Quick prototyping

**Advanced Playground (`/playground/advanced`):**
- Multi-file editor
- File tree sidebar
- Package installation UI
- Tab-based file switching
- Session save/load

**Collaborative Playground (`/playground/collab`):**
- Real-time multi-user editing
- User presence indicators
- Shared execution
- Session-based URLs

**Dashboard (`/dashboard`):**
- Execution history
- Usage metrics
- Performance analytics
- Recent runs

---

## License

FSL-1.1-MIT - See [LICENSE](./LICENSE) for details.

Built with ❤️ using [Cloudflare Workers](https://workers.cloudflare.com), [Cloudflare Sandbox](https://developers.cloudflare.com/sandbox/), and [Hono](https://hono.dev)

