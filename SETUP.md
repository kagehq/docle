# Docle Production Setup Guide

Complete step-by-step guide to deploy Docle with authentication and billing.

## Prerequisites

- ✅ Cloudflare account (free)
- ✅ Workers Paid plan ($5/month) for Sandbox access
- ✅ Stripe account (free, pay-as-you-go)
- ✅ Node.js 18+ installed
- ✅ (Optional) Resend account for email delivery

## Step 1: Clone & Install

```bash
git clone https://github.com/kagehq/docle.git
cd docle
npm install
```

## Step 2: Create Cloudflare Resources

### 2.1 Create KV Namespace

```bash
npx wrangler kv namespace create RUNS
```

**Output:**
```
✨ Success! Add the following to your wrangler.toml:
[[kv_namespaces]]
binding = "RUNS"
id = "abc123..."
```

Copy the `id` value for later.

### 2.2 Create D1 Database

```bash
npx wrangler d1 create docle-db
```

**Output:**
```
✨ Success! Add the following to your wrangler.toml:
[[d1_databases]]
binding = "DB"
database_name = "docle-db"
database_id = "xyz789..."
```

Copy the `database_id` value for later.

### 2.3 Initialize Database Schema

```bash
npx wrangler d1 execute docle-db --file=./schema.sql
```

**Verify:**
```bash
npx wrangler d1 execute docle-db --command="SELECT name FROM sqlite_master WHERE type='table'"
```

You should see: `projects`, `api_keys`, `usage`, `magic_links`, `sessions`, `invoices`

## Step 3: Set Up Stripe

### 3.1 Create Stripe Account

1. Go to https://stripe.com and sign up
2. Complete your business profile
3. Navigate to Developers → API keys

### 3.2 Create Metered Product

1. Go to **Products** → **Create Product**
2. Name: "Docle API Usage"
3. Pricing model: **Metered pricing**
4. Usage type: **Sum of usage during period**
5. Price: $0.001 per unit (or your preferred pricing)
6. Billing period: Monthly
7. **Save** and copy the **Price ID** (starts with `price_...`)

### 3.3 Get API Keys

1. Go to **Developers** → **API keys**
2. Copy your **Secret key** (starts with `sk_test_...` or `sk_live_...`)
3. Save these securely - never commit to git!

### 3.4 Set Up Webhook

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `https://YOUR-DOMAIN.workers.dev/api/stripe/webhook`
4. Select events to listen to:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `checkout.session.completed`
5. **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_...`)

## Step 4: Configure wrangler.toml

Update `wrangler.toml` with your values:

```toml
name = "docle"
main = "src/index.ts"
compatibility_date = "2025-05-06"
compatibility_flags = ["nodejs_compat"]

# KV namespace (from Step 2.1)
[[kv_namespaces]]
binding = "RUNS"
id = "YOUR_KV_ID_HERE"              # ← Replace this
preview_id = "YOUR_KV_PREVIEW_ID"   # ← Replace this

# D1 database (from Step 2.2)
[[d1_databases]]
binding = "DB"
database_name = "docle-db"
database_id = "YOUR_D1_ID_HERE"     # ← Replace this

[vars]
APP_NAME = "Docle"
APP_URL = "https://YOUR-DOMAIN.workers.dev"  # ← Replace with your domain
ENVIRONMENT = "production"

# Stripe (from Step 3)
STRIPE_SECRET_KEY = "sk_live_..."           # ← Replace with your secret key
STRIPE_WEBHOOK_SECRET = "whsec_..."         # ← Replace with webhook secret
STRIPE_PRICE_ID = "price_..."               # ← Replace with price ID

# Pricing configuration (optional)
STRIPE_PRICE_PER_RUN = "0.001"
STRIPE_PRICE_PER_CPU_MS = "0.00001"
FREE_TIER_RUNS_LIMIT = "100"

# Email (optional - for production magic links)
# RESEND_API_KEY = "re_..."
# EMAIL_FROM = "noreply@your-domain.com"

# Durable Object for Collaborative Sessions
[[durable_objects.bindings]]
name = "COLLAB_SESSION"
class_name = "CollabSession"

# For production Sandbox (requires Containers beta access)
# [[containers]]
# class_name = "Sandbox"
# image = "./Dockerfile"
# name = "docle-sandbox"
# max_instances = 10
#
# [[durable_objects.bindings]]
# name = "SANDBOX"
# class_name = "Sandbox"
```

## Step 5: Install Dependencies

```bash
npm install
```

This installs:
- `stripe` - Stripe SDK for billing
- `hono` - Web framework
- `@cloudflare/sandbox` - Code execution
- TypeScript & tooling

## Step 6: Deploy to Cloudflare

```bash
npm run deploy
```

**Output:**
```
✨ Published docle
   https://docle.YOUR-SUBDOMAIN.workers.dev
```

Your API is now live! 🚀

## Step 7: Update Stripe Webhook URL

Go back to Stripe Dashboard → Webhooks and update the endpoint URL to your actual deployment URL:

```
https://docle.YOUR-SUBDOMAIN.workers.dev/api/stripe/webhook
```

## Step 8: Test Your Deployment

### 8.1 Visit Login Page

```bash
open https://docle.YOUR-SUBDOMAIN.workers.dev/login
```

### 8.2 Sign In with Magic Link

1. Enter your email
2. Check console logs (dev mode) or email (production)
3. Click the magic link
4. You're redirected to the dashboard!

### 8.3 Create API Key

1. In dashboard, click **"+ New Key"**
2. Name it "Test Key"
3. Copy the API key (starts with `sk_live_...`)
4. **Save it securely** - you won't see it again!

### 8.4 Test Code Execution

```bash
export DOCLE_API_KEY="sk_live_YOUR_KEY"

curl -X POST https://docle.YOUR-SUBDOMAIN.workers.dev/api/run \
  -H "Authorization: Bearer $DOCLE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "print(\"Hello from Docle!\")",
    "lang": "python"
  }'
```

**Expected Response:**
```json
{
  "id": "uuid...",
  "ok": true,
  "exitCode": 0,
  "stdout": "Hello from Docle!\n",
  "stderr": "",
  "usage": {
    "durationMs": 250,
    "cpuMs": 0,
    "memMB": 0
  },
  "createdAt": "2025-10-25T12:00:00Z"
}
```

### 8.5 Check Usage Dashboard

Visit your dashboard to see:
- ✅ Usage metrics (runs, CPU time, cost)
- ✅ API key management
- ✅ Usage trends chart
- ✅ Billing information

## Step 9: (Optional) Set Up Email

For production magic links, integrate an email service:

### Option A: Resend (Recommended)

1. Sign up at https://resend.com
2. Add and verify your domain
3. Get API key
4. Update `wrangler.toml`:

```toml
RESEND_API_KEY = "re_..."
EMAIL_FROM = "noreply@your-domain.com"
```

### Option B: SendGrid, Mailgun, etc.

Modify `src/api/magic-link.ts` function `sendMagicLinkEmail()` to use your preferred email service.

## Step 10: (Optional) Custom Domain

1. Go to Cloudflare Dashboard → Workers & Pages
2. Select your `docle` worker
3. Click **Triggers** tab
4. Click **Add Custom Domain**
5. Enter your domain (e.g., `api.yourdomain.com`)
6. Wait for DNS to propagate
7. Update `APP_URL` in `wrangler.toml`

## Troubleshooting

### Magic Links Not Working

**Development:**
- Magic links are printed to console
- Check `wrangler dev` logs

**Production:**
- Verify `RESEND_API_KEY` is set
- Check Resend dashboard for delivery status
- Verify `EMAIL_FROM` domain is verified

### Stripe Webhooks Failing

**Check webhook logs:**
1. Stripe Dashboard → Webhooks → Click your endpoint
2. View recent deliveries and responses

**Common issues:**
- Wrong webhook secret
- Endpoint URL doesn't match deployment
- Missing event selections

### Database Errors

```bash
# Re-run migration
npx wrangler d1 execute docle-db --file=./schema.sql

# Check tables
npx wrangler d1 execute docle-db --command="SELECT name FROM sqlite_master WHERE type='table'"
```

### Rate Limit Issues

**Free tier limit:**
- Default: 100 runs/month
- Change in `wrangler.toml`: `FREE_TIER_RUNS_LIMIT = "500"`

**Upgrade to Pro:**
- Dashboard → Billing → Upgrade to Pro

## Next Steps

### Production Checklist

- [ ] Custom domain configured
- [ ] Email service integrated (Resend/SendGrid)
- [ ] Stripe test mode → live mode
- [ ] API keys rotated after testing
- [ ] Monitoring set up (Cloudflare Analytics)
- [ ] Rate limits configured appropriately
- [ ] Documentation shared with your team

### Scaling

**Free tier:**
- 100,000 requests/day
- 10ms CPU time per request
- 128 MB memory

**Paid tier ($5/month):**
- 10 million requests/month
- 50ms CPU time per request
- 128 MB memory
- Additional usage billed at $0.50/million requests

### Security Best Practices

1. **Rotate API keys regularly**
2. **Use Stripe live mode** for production
3. **Enable Cloudflare WAF** for DDoS protection
4. **Monitor usage** for anomalies
5. **Set up alerts** for high usage
6. **Keep secrets in wrangler.toml** (never commit to git)

## Support

- 📚 [Documentation](README.md)
- 🐛 [Report Issues](https://github.com/kagehq/docle/issues)
- 💬 [Discussions](https://github.com/kagehq/docle/discussions)

---

**Congratulations! 🎉**

Your production-ready Docle instance is now live with authentication, billing, and metered usage tracking!

