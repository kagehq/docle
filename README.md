# Docle

**Run untrusted code safely with API keys and metered billing.** Execute Python and Node.js code in secure sandboxes at the edge. Production-ready with authentication, usage tracking, and Stripe billing.

## Why?

Modern apps need to run code they didn't write like AI-generated scripts, user automations, plugins, custom logic. But doing it safely is hard.

Docle makes it simple. Run your users' code safely with authentication and metered billing built in.

## What You Get

- **Fast** - Runs on Cloudflare's edge (<50ms latency)
- **Secure** - Isolated V8 sandboxes with API key authentication
- **Production-Ready** - Usage metering, Stripe billing, rate limits
- **Beautiful Dashboard** - Manage API keys, track usage, view invoices
- **Magic Link Auth** - Passwordless authentication for web dashboard
- **Full-featured** - npm/pip packages, multi-file projects, real-time collaboration

**Perfect for:** Educational platforms • AI agents • Code playgrounds • SaaS plugins • Live interviews

## Quick Start

### 1. Create an Account

Visit your deployed Docle instance at `https://your-domain.com/login` and sign in with your email. You'll receive a magic link to authenticate.

### 2. Create an API Key

Once logged in, go to your dashboard and create an API key. Save it securely - you'll only see it once!

### 3. Execute Code

```bash
curl -X POST https://your-domain.com/api/run \
  -H "Authorization: Bearer sk_live_YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "print(\"Hello, Docle!\")",
    "lang": "python"
  }'
```

## Features

### 🔐 Authentication & Authorization

- **Magic Link Auth** - Passwordless login via email
- **API Key Management** - Create, rotate, and revoke keys
- **Session Management** - Secure web dashboard access
- **Rate Limiting** - Free tier limits with upgrade prompts

### 💳 Billing & Metering

- **Free Tier** - 100 runs/month included
- **Metered Billing** - Pay only for what you use ($0.001/run default)
- **Stripe Integration** - Automated billing and invoices
- **Usage Tracking** - Real-time metrics and trends
- **Customer Portal** - Self-service subscription management

### 📊 Dashboard Features

- **Usage Analytics** - Runs, CPU time, cost tracking
- **Usage Trends** - 6-month historical charts
- **API Key Management** - Create and revoke keys
- **Billing Portal** - Upgrade, downgrade, view invoices
- **Quick Start Guides** - API examples in the dashboard

### 🚀 Code Execution

- ✅ **Python 3** and **Node.js** support
- ✅ Install **npm/pip packages** before execution
- ✅ **Multi-file projects** with custom entry points
- ✅ **Real-time collaboration** with WebSocket-powered editing
- ✅ **Execution history** stored for 7 days
- ✅ **Configurable policies** (timeout, memory, network access)

## Installation & Setup

### Prerequisites

- Cloudflare account
- Workers Paid plan ($5/month) for Sandbox access
- Stripe account for billing

### 1. Create Infrastructure

```bash
# Clone repository
git clone https://github.com/kagehq/docle.git
cd docle

# Install dependencies
npm install

# Create KV namespace for runs
npx wrangler kv namespace create RUNS

# Create D1 database for projects/keys/usage
npx wrangler d1 create docle-db
```

### 2. Configure wrangler.toml

Update `wrangler.toml` with your credentials:

```toml
# KV namespace ID (from step 1)
[[kv_namespaces]]
binding = "RUNS"
id = "YOUR_KV_ID_HERE"

# D1 database ID (from step 1)
[[d1_databases]]
binding = "DB"
database_name = "docle-db"
database_id = "YOUR_D1_ID_HERE"

[vars]
APP_URL = "https://your-domain.com"
ENVIRONMENT = "production"

# Stripe Configuration
STRIPE_SECRET_KEY = "sk_live_..."
STRIPE_WEBHOOK_SECRET = "whsec_..."
STRIPE_PRICE_ID = "price_..."

# Pricing (optional)
STRIPE_PRICE_PER_RUN = "0.001"
FREE_TIER_RUNS_LIMIT = "100"

# Email (optional, for magic links)
RESEND_API_KEY = "re_..."
EMAIL_FROM = "noreply@your-domain.com"
```

### 3. Set Up Stripe

1. Create a Stripe account at https://stripe.com
2. Create a **Product** with **Metered Pricing**:
   - Go to Products → Create Product
   - Choose "Metered billing"
   - Set usage type to "Sum of usage during period"
   - Copy the Price ID to `STRIPE_PRICE_ID`
3. Get your **API keys**:
   - Dashboard → Developers → API keys
   - Copy Secret key to `STRIPE_SECRET_KEY`
4. Set up **Webhook**:
   - Dashboard → Developers → Webhooks
   - Add endpoint: `https://your-domain.com/api/stripe/webhook`
   - Select events: `customer.subscription.*`, `invoice.*`, `checkout.session.completed`
   - Copy signing secret to `STRIPE_WEBHOOK_SECRET`

### 4. Initialize Database

```bash
# Run schema migration
npx wrangler d1 execute docle-db --file=./schema.sql

# Verify tables were created
npx wrangler d1 execute docle-db --command="SELECT name FROM sqlite_master WHERE type='table'"
```

### 5. Deploy

```bash
# Deploy to Cloudflare Workers
npm run deploy

# Your API will be live at:
# https://docle.YOUR-SUBDOMAIN.workers.dev
```

### 6. Test It Out

```bash
# Visit your dashboard
open https://your-domain.com/login

# Sign in with your email
# Create an API key
# Test execution:

curl -X POST https://your-domain.com/api/run \
  -H "Authorization: Bearer sk_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"code":"print(42)","lang":"python"}'
```

## Local Development

```bash
# Install dependencies
npm install
cd playground && npm install && cd ..

# Start development servers
./start.sh
```

Visit:
- **Playground:** http://localhost:3001
- **API:** http://localhost:8787
- **Dashboard:** http://localhost:8787/login

**Note:** 
- Cloudflare Sandbox only works in production (local dev uses simulation mode)
- In development, magic links are printed to console instead of emailed

## API Reference

### Authentication

#### Request Magic Link

```bash
POST /auth/magic-link
Content-Type: application/json

{
  "email": "you@example.com"
}
```

#### Verify Magic Link

```bash
GET /auth/verify?token=TOKEN_FROM_EMAIL
```

Creates a session and redirects to dashboard.

#### Get Current User

```bash
GET /auth/me
Cookie: docle_session=SESSION_TOKEN
```

#### Logout

```bash
POST /auth/logout
Cookie: docle_session=SESSION_TOKEN
```

### API Keys

#### Create API Key

```bash
POST /api/keys
Cookie: docle_session=SESSION_TOKEN
Content-Type: application/json

{
  "name": "Production API"
}

Response:
{
  "key": "sk_live_...", # Only returned once!
  "id": "key_id",
  "prefix": "sk_live_abcd"
}
```

#### List API Keys

```bash
GET /api/keys
Cookie: docle_session=SESSION_TOKEN
```

#### Revoke API Key

```bash
DELETE /api/keys/:id
Cookie: docle_session=SESSION_TOKEN
```

### Code Execution

#### Execute Code

```bash
POST /api/run
Authorization: Bearer sk_live_YOUR_API_KEY
Content-Type: application/json

{
  "code": "print('Hello, World!')",
  "lang": "python",
  "policy": {
    "timeoutMs": 3000,
    "memoryMB": 256,
    "allowNet": false
  }
}

Response:
{
  "id": "run_id",
  "ok": true,
  "exitCode": 0,
  "stdout": "Hello, World!\n",
  "stderr": "",
  "usage": {
    "cpuMs": 45,
    "memMB": 12,
    "durationMs": 250
  },
  "createdAt": "2025-10-25T12:00:00Z"
}
```

#### Get Execution Result

```bash
GET /api/run/:id
```

### Usage & Billing

#### Get Usage Stats

```bash
GET /api/usage?period=2025-10
Cookie: docle_session=SESSION_TOKEN

Response:
{
  "period": "2025-10",
  "runs": 42,
  "cpuMs": 1234,
  "cost": 0.042,
  "avgDurationMs": 250
}
```

#### Get Usage Trends

```bash
GET /api/usage/trends?months=6
Cookie: docle_session=SESSION_TOKEN
```

## Dashboard Routes

- `/login` - Magic link login page
- `/dashboard` - Main dashboard (projects, keys, usage)
- `/dashboard/billing` - Billing and subscription management

## Usage Examples

### TypeScript SDK

```typescript
import { runSandbox } from '@doclehq/sdk';

// Configure with your API key
const result = await runSandbox('print("Hello!")', {
  lang: 'python',
  apiKey: 'sk_live_YOUR_KEY'
});

console.log(result.stdout);
```

### React Component

```tsx
import { DoclePlayground } from '@doclehq/react';

<DoclePlayground
  lang="python"
  code="print('Hello, React!')"
  apiKey="sk_live_YOUR_KEY"
  onRun={(result) => console.log(result.stdout)}
/>
```

### Vue 3 Component

```vue
<script setup>
import { DoclePlayground } from '@doclehq/vue';
</script>

<template>
  <DoclePlayground 
    lang="python" 
    code="print('Hello, Vue!')"
    api-key="sk_live_YOUR_KEY"
  />
</template>
```

## Plans & Pricing

### Free Tier
- 100 runs per month
- Python & Node.js support
- 3 second timeout
- Community support
- **$0/month**

### Pro Plan
- Unlimited runs
- Metered billing: $0.001 per run
- Priority support
- Extended timeouts
- Advanced features
- **Pay as you go**

## Security

- **API Key Authentication** - SHA-256 hashed keys
- **Rate Limiting** - Free tier limits enforced
- **Isolated Sandboxes** - V8 isolates per execution
- **Session Security** - HTTP-only, secure cookies
- **Magic Link Auth** - 15-minute expiration
- **Webhook Verification** - Stripe signature validation

## Architecture

```
User
  ↓
Magic Link Auth → Dashboard (Sessions)
  ↓
Create API Key
  ↓
API Request (API Key Auth)
  ↓
Rate Limit Check → Free Tier Enforcement
  ↓
Cloudflare Sandbox → Code Execution
  ↓
Usage Recording → D1 Database
  ↓
Stripe Metered Billing → Invoice Generation
```

## Documentation

- 📘 **[DETAILED.md](DETAILED.md)** - Complete documentation (1,400+ lines)
- ⚛️ **[React Docs](packages/react/README.md)** - React components & hooks
- 💚 **[Vue Docs](packages/vue/README.md)** - Vue 3 components & composables
- 📦 **[SDK Docs](sdk/README.md)** - TypeScript SDK reference
- 💡 **[Examples](examples/)** - Integration examples

## Troubleshooting

### Magic Links Not Sending

- Check `RESEND_API_KEY` in wrangler.toml
- In development, links are logged to console
- Verify `EMAIL_FROM` domain is verified in Resend

### Stripe Webhooks Failing

- Verify `STRIPE_WEBHOOK_SECRET` is correct
- Check webhook endpoint URL matches your domain
- Ensure webhook events are selected in Stripe Dashboard

### D1 Database Errors

- Run `npx wrangler d1 execute docle-db --file=./schema.sql`
- Verify `database_id` in wrangler.toml
- Check D1 binding name is "DB"

### Rate Limit Errors

- Free tier: 100 runs/month
- Upgrade to Pro in dashboard → billing
- Adjust `FREE_TIER_RUNS_LIMIT` in wrangler.toml

## Contributing

We welcome contributions! Feel free to:
- Open issues for bugs or feature requests
- Submit PRs for improvements
- Share your use cases

## License

FSL-1.1-MIT - See [LICENSE](./LICENSE) for details.

---

**Built with ❤️ using:**
- [Cloudflare Workers](https://workers.cloudflare.com) - Edge runtime
- [Cloudflare D1](https://developers.cloudflare.com/d1/) - SQL database
- [Cloudflare Sandbox](https://developers.cloudflare.com/sandbox/) - Code execution
- [Hono](https://hono.dev) - Web framework
- [Stripe](https://stripe.com) - Billing & payments

**Questions?** Open an issue or check out the [detailed documentation](DETAILED.md).
