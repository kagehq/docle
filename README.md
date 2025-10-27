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

- **Fast** - Runs on Cloudflare's edge network (<50ms latency)
- **Secure** - Isolated sandboxes, can't touch your infrastructure  
- **Full-featured** - npm/pip packages, multi-file projects, real-time collaboration
- **Works everywhere** - React, Vue, vanilla JS, or REST API

## Get Started

### Use Cloud (Recommended)

Sign up at **[app.docle.co](https://app.docle.co)** - no setup required.

1. Create a project
2. Generate an API key
3. Start building!

**Features:** Free tier (100 req/min), dashboard, analytics, domain restrictions.

### Self-Host

Deploy your own instance on Cloudflare Workers. [**→ Guide**](DETAILED.md#deployment-guide)

### Develop Locally

```bash
git clone https://github.com/kagehq/docle.git && cd docle
npm install && cd playground && npm install && cd ..
./start.sh  # API: localhost:8787, Dashboard: localhost:3001
```

[**→ Full local setup guide**](DETAILED.md#deployment-guide)

---

## Quick Example

### Server-side (Recommended)

Keep your API key secure by proxying through your backend:

```typescript
// app/api/docle/route.ts (Next.js)
export async function POST(req: Request) {
  const { code, lang } = await req.json();
  
  return fetch('https://api.docle.co/api/run', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.DOCLE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ code, lang })
  });
}
```

```tsx
// Your component
import { useDocle } from '@doclehq/react';

function Editor() {
  const { run, result, loading } = useDocle({ endpoint: '/api/docle' });
  
  return (
    <>
      <button onClick={() => run('print("Hello!")', { lang: 'python' })}>
        Run Code
      </button>
      {result && <pre>{result.stdout}</pre>}
    </>
  );
}
```

### Direct API (cURL)

Use from any language with simple HTTP requests:

```bash
curl -X POST https://api.docle.co/api/run \
  -H "Authorization: Bearer sk_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"code": "print(\"Hello!\")", "lang": "python"}'
```

---

## Installation

```bash
# Choose what you need
npm install @doclehq/sdk        # TypeScript SDK (server-side)
npm install @doclehq/react      # React hooks + components
npm install @doclehq/vue        # Vue composables + components
npm install @doclehq/rate-limit # Per-user rate limiting helper
```

**CDN (quick test):**
```html
<script src="https://unpkg.com/@doclehq/embed@latest/dist/embed.js"></script>
<div data-docle data-lang="python">print("Hello!")</div>
```

---

## Security

✅ **Use server proxies** - Keep API keys server-side  
✅ **Set domain restrictions** - Whitelist allowed origins in dashboard  
✅ **Implement per-user rate limiting** - Prevent quota exhaustion  
✅ **Monitor usage** - Track executions in your dashboard  

[**→ Complete security guide**](DETAILED.md#security--sandboxing)

---

## Documentation

| Guide | Description |
|-------|-------------|
| **[DETAILED.md](DETAILED.md)** | Complete API reference, authentication, rate limiting, analytics |
| **[React](packages/react/README.md)** | React hooks and components |
| **[Vue](packages/vue/README.md)** | Vue composables and components |
| **[SDK](sdk/README.md)** | TypeScript SDK for direct API integration |
| **[Rate Limit](packages/rate-limit/README.md)** | Per-user rate limiting helper |
| **[Examples](examples/)** | Working code examples |

---

## Advanced Features

- **Usage analytics** - Detailed execution history and metrics  
- **Rate limiting** - Per-API-key limits (1-10,000 req/min)
- **Domain restrictions** - Whitelist origins per key
- **User tracking** - Track which users run what code
- **Collaboration** - Real-time multi-user editing
- **Package support** - Install npm/pip packages on-the-fly
- **Multi-file projects** - Full project execution with imports

[**→ See all features**](DETAILED.md)

---

## License

FSL-1.1-MIT • Built with [Cloudflare Sandbox](https://sandbox.cloudflare.com)
