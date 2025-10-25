# Docle Phase 2 - Governance & Billing Upgrade

## 🎉 What's New

Your Docle codebase has been upgraded to a **production-ready SaaS platform** with:

- ✅ **Authentication** - Magic link passwordless auth
- ✅ **API Key Management** - Create, rotate, and revoke keys
- ✅ **Usage Metering** - Track every code execution
- ✅ **Stripe Billing** - Automated invoicing and payments
- ✅ **Dashboard** - Beautiful web UI for management
- ✅ **Rate Limiting** - Free tier with upgrade prompts
- ✅ **Database** - D1 for persistent data storage

## 📁 New File Structure

```
docle/
├── schema.sql                    # D1 database schema (NEW)
├── SETUP.md                      # Setup guide (NEW)
├── UPGRADE_SUMMARY.md           # This file (NEW)
│
├── src/
│   ├── index.ts                 # Updated with new routes
│   │
│   ├── api/                     # NEW: API modules
│   │   ├── auth.ts             # Authentication middleware
│   │   ├── billing.ts          # Stripe webhooks
│   │   ├── magic-link.ts       # Magic link auth flow
│   │   └── usage.ts            # Usage tracking
│   │
│   └── lib/
│       ├── db.ts               # NEW: D1 database wrapper
│       ├── stripe.ts           # NEW: Stripe integration
│       └── ui.ts               # NEW: Dashboard HTML templates
│
└── wrangler.toml               # Updated with D1 & Stripe config
```

## 🗄️ Database Schema

The following tables have been added to D1:

### `projects`
- User accounts with email and API keys
- Plan tracking (free/pro/enterprise)
- Stripe customer/subscription IDs

### `api_keys`
- Multiple keys per project
- SHA-256 hashed for security
- Track last usage and active status

### `usage`
- Per-run metrics (CPU, memory, duration)
- Monthly aggregation
- Cost calculation

### `magic_links`
- Passwordless authentication tokens
- 15-minute expiration
- One-time use

### `sessions`
- Web dashboard authentication
- 30-day expiration
- HTTP-only secure cookies

### `invoices`
- Billing history from Stripe
- Payment status tracking
- Period-based records

## 🔑 New API Endpoints

### Authentication
- `POST /auth/magic-link` - Request magic link
- `GET /auth/verify?token=xxx` - Verify and create session
- `POST /auth/logout` - End session
- `GET /auth/me` - Get current user

### Dashboard (Session Auth)
- `GET /login` - Login page
- `GET /dashboard` - Main dashboard
- `GET /dashboard/billing` - Billing & subscription

### API Keys (Session Auth)
- `POST /api/keys` - Create new key
- `GET /api/keys` - List all keys
- `DELETE /api/keys/:id` - Revoke key

### Usage Stats (Session Auth)
- `GET /api/usage` - Current period usage
- `GET /api/usage/trends` - Historical trends

### Code Execution (API Key Auth)
- `POST /api/run` - Execute code (NOW REQUIRES API KEY)
- `GET /api/run/:id` - Get result

### Billing
- `POST /api/stripe/webhook` - Stripe events

## 🔒 Authentication Flow

### 1. Magic Link Auth (Web Dashboard)

```
User enters email
    ↓
Magic link sent to email
    ↓
User clicks link
    ↓
Session created (30-day cookie)
    ↓
Access dashboard
```

### 2. API Key Auth (Code Execution)

```
Create API key in dashboard
    ↓
Add to Authorization header
    ↓
Validated against D1 (SHA-256 hash)
    ↓
Rate limit check (free tier)
    ↓
Execute code
    ↓
Record usage → Stripe metering
```

## 💳 Billing Flow

### Free Tier
- 100 runs/month included
- No credit card required
- Upgrade prompt at limit

### Pro Tier (Metered)
```
Code execution
    ↓
Usage recorded in D1
    ↓
Reported to Stripe (metered usage)
    ↓
Monthly invoice generated
    ↓
Payment collected
    ↓
Webhook updates project status
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

This adds `stripe` to your dependencies.

### 2. Set Up Infrastructure

```bash
# Create D1 database
npx wrangler d1 create docle-db

# Initialize schema
npx wrangler d1 execute docle-db --file=./schema.sql

# Create KV namespace (if not already done)
npx wrangler kv namespace create RUNS
```

### 3. Configure Stripe

See `SETUP.md` for detailed Stripe configuration.

You need:
- Secret key
- Webhook secret
- Metered price ID

### 4. Update wrangler.toml

Replace placeholders:
- `YOUR_D1_DATABASE_ID_HERE`
- `sk_test_...` (Stripe secret)
- `whsec_...` (Webhook secret)
- `price_...` (Price ID)

### 5. Deploy

```bash
npm run deploy
```

### 6. Test

```bash
# Visit dashboard
open https://your-worker.workers.dev/login

# Sign in with email
# Create API key
# Test execution:

curl -X POST https://your-worker.workers.dev/api/run \
  -H "Authorization: Bearer sk_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"code":"print(42)","lang":"python"}'
```

## 🎨 Dashboard Features

### Main Dashboard
- **Usage metrics** - Runs, CPU time, cost
- **API key management** - Create, view, revoke
- **Usage trends** - 6-month chart
- **Quick start** - API examples

### Billing Page
- **Plan overview** - Current plan & limits
- **Usage summary** - Current month stats
- **Invoice history** - Payment records
- **Upgrade/manage** - Stripe Checkout & Portal

## 🔐 Security Features

- **API Key Hashing** - SHA-256 (never stored plaintext)
- **Magic Link Expiry** - 15 minutes, one-time use
- **Session Security** - HTTP-only, secure cookies
- **Rate Limiting** - Free tier enforcement
- **Webhook Verification** - Stripe signature validation

## 📊 Usage Tracking

Every code execution records:
- Timestamp
- Project ID & API key ID
- Runs count (1)
- CPU milliseconds
- Memory MB
- Duration
- Calculated cost
- Monthly period (YYYY-MM)

Aggregated for:
- Dashboard metrics
- Usage trends
- Stripe metered billing
- Invoice generation

## 💰 Pricing Model

### Default Configuration

**Free Tier:**
- 100 runs/month
- $0.00

**Pro Tier (Metered):**
- $0.001 per run
- $0.00001 per CPU millisecond
- Billed monthly via Stripe

### Customization

Change in `wrangler.toml`:

```toml
FREE_TIER_RUNS_LIMIT = "500"      # 500 free runs
STRIPE_PRICE_PER_RUN = "0.002"     # $0.002/run
STRIPE_PRICE_PER_CPU_MS = "0.00002" # $0.00002/CPU ms
```

## 🔄 Migration Notes

### Breaking Changes

⚠️ **`POST /api/run` now requires authentication**

Before:
```bash
curl -X POST https://api.docle.co/api/run \
  -d '{"code":"print(42)","lang":"python"}'
```

After:
```bash
curl -X POST https://api.docle.co/api/run \
  -H "Authorization: Bearer sk_live_YOUR_KEY" \
  -d '{"code":"print(42)","lang":"python"}'
```

### Backward Compatibility

To keep public access (not recommended):
1. Comment out `requireAuth` middleware in `src/index.ts`
2. Or create a "public" API key and document it

### Data Migration

If you have existing users:
1. Run migration script to create projects
2. Generate API keys for existing users
3. Email keys to users
4. Notify of authentication requirement

## 📚 Next Steps

### Development

1. **Test locally:**
   ```bash
   npm run dev
   # Magic links print to console in dev mode
   ```

2. **Create test project:**
   - Visit http://localhost:8787/login
   - Sign in with test email
   - Create API key
   - Test execution

### Production

1. **Complete Stripe setup** (see `SETUP.md`)
2. **Configure email service** (Resend recommended)
3. **Add custom domain**
4. **Switch Stripe to live mode**
5. **Deploy:** `npm run deploy`
6. **Update webhook URL** in Stripe

### Customization

**Change free tier limit:**
```toml
FREE_TIER_RUNS_LIMIT = "1000"
```

**Adjust pricing:**
```toml
STRIPE_PRICE_PER_RUN = "0.005"
```

**Customize dashboard:**
Edit `src/lib/ui.ts` for branding, colors, etc.

**Add features:**
- Team collaboration
- Usage alerts
- API rate limiting per key
- Webhook notifications
- Custom plans/tiers

## 🐛 Troubleshooting

### "Missing API key" error
- Add `Authorization: Bearer sk_live_XXX` header
- Check key is active in dashboard

### Magic links not arriving
- Check console logs (dev mode)
- Verify `RESEND_API_KEY` (production)
- Check spam folder

### Stripe webhooks failing
- Verify webhook secret matches
- Check endpoint URL is correct
- Review Stripe webhook logs

### Database errors
```bash
# Re-run schema
npx wrangler d1 execute docle-db --file=./schema.sql
```

## 📖 Documentation

- **[SETUP.md](SETUP.md)** - Detailed setup guide
- **[README.md](README.md)** - Updated with auth & billing
- **[DETAILED.md](DETAILED.md)** - Complete technical docs

## 🎯 What You Have Now

A **production-ready SaaS platform** with:

✅ Secure authentication
✅ API key management  
✅ Usage metering
✅ Automated billing
✅ Beautiful dashboard
✅ Rate limiting
✅ Scalable infrastructure

**Ready to monetize your code execution API!** 💰

---

Questions? Check the docs or open an issue on GitHub.

