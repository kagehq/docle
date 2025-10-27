# Docle

**Run untrusted code safely.** Execute Python and Node.js code in secure sandboxes at the edge. No servers, no Docker, no complexity.

## Why?

Modern apps need to run code they didn't write like AI-generated scripts, user automations, plugins, custom logic. But doing it safely is hard.

Docle makes it simple. Run your users' code safely with one line:

```html
<script src="https://unpkg.com/@doclehq/embed@latest/dist/embed.js"></script>
<div data-docle>print("Hello, World!")</div>
```

That's it. Your users can now run Python and Node.js code safely in your app.

## What You Get

- **Fast** - Runs on Cloudflare's edge (<50ms latency)
- **Secure** - Isolated V8 sandboxes, no access to your infrastructure
- **Beautiful UI** - Code editor with syntax highlighting included
- **Full-featured** - npm/pip packages, multi-file projects, real-time collaboration
- **Works everywhere** - React, Vue, vanilla JS, or pure REST API

**Perfect for:** Educational platforms • AI agents • Code playgrounds • SaaS plugins • Live interviews

## Quick Start

### Try it Now

Visit [app.docle.co](https://app.docle.co) for a live playground with real code execution.

### Get an API Key (Required)

**API keys are required for all Docle usage** to prevent abuse and ensure fair access.

Sign up at [app.docle.co/login](https://app.docle.co/login) to:
- ✅ Create projects and API keys
- ✅ Track usage and analytics
- ✅ Unlimited executions (free during beta)
- ✅ Secure, isolated sandboxes per project
- ✅ Optional domain restrictions for enhanced security

Each API key is tied to a project, giving you full control and visibility over your code executions.

> **⚠️ Security Best Practice:** Never expose API keys in client-side code. Use server-side proxies or implement domain restrictions to protect your keys.

### Install

Choose your flavor:

```bash
# TypeScript/JavaScript SDK
npm install @doclehq/sdk

# React components
npm install @doclehq/react

# Vue 3 components
npm install @doclehq/vue
```

Or use the CDN for zero-install embedding.

## Usage

### 1. REST API (Server-Side Only)

**⚠️ Important:** Always use API keys from server-side code to keep them secure.

```bash
curl -X POST https://api.docle.co/api/run \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_live_YOUR_API_KEY" \
  -d '{
    "code": "print(\"Hello, Docle!\")",
    "lang": "python"
  }'
```

Response:
```json
{
  "id": "run_xxx",
  "ok": true,
  "exitCode": 0,
  "stdout": "Hello, Docle!\n",
  "stderr": "",
  "usage": { "durationMs": 45 }
}
```

### 2. TypeScript SDK (Server-Side Only)

**⚠️ Important:** Only use the SDK in server-side environments (Node.js, Deno, Bun, Edge Functions).

```typescript
import { runSandbox } from '@doclehq/sdk';

// Use environment variables to keep keys secure
const result = await runSandbox('print("Hello!")', { 
  lang: 'python',
  apiKey: process.env.DOCLE_API_KEY
});

console.log(result.stdout); // "Hello!\n"
```

### 3. React

**Option A: useDocle Hook with Server Proxy (Most Secure)**

```tsx
// app/api/docle/api/run/route.ts (Next.js API Route)
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { code, lang, policy } = await req.json();
  
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

// Component.tsx
import { useDocle } from '@doclehq/react';

function MyEditor() {
  const { run, result, loading } = useDocle({ endpoint: '/api/docle' });
  const [code, setCode] = useState('print("Hello!")');

  return (
    <div>
      <textarea value={code} onChange={(e) => setCode(e.target.value)} />
      <button onClick={() => run(code, { lang: 'python' })}>Run</button>
      {result && <pre>{result.stdout}</pre>}
    </div>
  );
}
```

**Option B: DoclePlayground with Domain Restrictions (Simple, with UI)**

```tsx
import { DoclePlayground } from '@doclehq/react';

<DoclePlayground
  lang="python"
  code="print('Hello, React!')"
  apiKey="sk_live_YOUR_API_KEY"  // Required - configure domain restrictions in dashboard
  onRun={(result) => console.log(result.stdout)}
/>
```

> **Note:** API keys are required for all Docle usage. [Sign up](https://app.docle.co/login) to get your free API key.

### 4. Vue 3

**Option A: useDocle Composable with Server Proxy (Most Secure)**

```vue
<script setup>
import { ref } from 'vue';
import { useDocle } from '@doclehq/vue';

const { run, result, loading } = useDocle({ endpoint: '/api/docle' });
const code = ref('print("Hello, Vue!")');

const handleRun = async () => {
  await run(code.value, { lang: 'python' });
};
</script>

<template>
  <div>
    <textarea v-model="code" />
    <button @click="handleRun" :disabled="loading">Run</button>
    <pre v-if="result">{{ result.stdout }}</pre>
  </div>
</template>
```

```typescript
// server/api/docle/api/run.post.ts (Nuxt 3 server route)
export default defineEventHandler(async (event) => {
  const { code, lang, policy } = await readBody(event);
  
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

**Option B: DoclePlayground with Domain Restrictions (Simple, with UI)**

```vue
<script setup>
import { DoclePlayground } from '@doclehq/vue';
</script>

<template>
  <DoclePlayground 
    lang="python" 
    code="print('Hello, Vue!')"
    api-key="sk_live_YOUR_API_KEY"
  />
</template>
```

> **Note:** API keys are required for all Docle usage. [Sign up](https://app.docle.co/login) to get your free API key.

### 5. CDN Embed or iFrame

**Option A: CDN Embed (Quick Setup)**
```html
<script src="https://unpkg.com/@doclehq/embed@latest/dist/embed.js"></script>

<!-- Set API key globally -->
<script>
  window.docleApiKey = 'sk_live_YOUR_API_KEY';  // Required
</script>

<div data-docle data-lang="python">
print("Hello, Docle!")
</div>
```

**Option B: Secure iframe with postMessage (Recommended)**
```html
<iframe id="docle" src="https://api.docle.co/embed?lang=python"></iframe>

<script>
// Send API key securely via postMessage
const iframe = document.getElementById('docle');
window.addEventListener('message', (e) => {
  if (e.data.type === 'docle-ready') {
    iframe.contentWindow.postMessage({
      type: 'docle-set-apikey',
      apiKey: await fetchKeyFromYourServer() // Get key from your backend
    }, '*');
  }
});
</script>
```

> **💡 Tip:** For production apps, use domain restrictions on your API keys to limit usage to your specific domains.

## Key Features

- ✅ **Python 3** and **Node.js** support
- ✅ Install **npm/pip packages** before execution
- ✅ **Multi-file projects** with custom entry points
- ✅ **Real-time collaboration** with WebSocket-powered editing
- ✅ **Execution history** stored for 7 days
- ✅ **Configurable policies** (timeout, memory, network access)
- ✅ **Enterprise security** (CSP, rate limiting, request size limits)
- ✅ **Domain restrictions** for API key security (wildcard support)
- ✅ **Beautiful playground** with CodeMirror 6 editor

## Local Development

```bash
git clone https://github.com/kagehq/docle.git
cd docle
npm install
cd playground && npm install && cd ..
./start.sh
```

Visit:
- **Playground:** http://localhost:3001
- **API:** http://localhost:8787

**Note:** Cloudflare Sandbox only works in production. Local dev uses simulation mode.

## Deploy to Production

**Requirements:**
- Cloudflare account
- Workers Paid plan ($5/month) for Sandbox access

**Steps:**

```bash
# 1. Create KV namespace
npx wrangler kv namespace create RUNS

# 2. Update wrangler.toml with the generated ID

# 3. Deploy
npm run deploy
```

Your API will be live at `https://docle.YOUR-SUBDOMAIN.workers.dev`

**Current deployment:** https://api.docle.co

## Documentation

- 📘 **[DETAILED.md](DETAILED.md)** - Complete documentation (1,400+ lines)
- ⚛️ **[React Docs](packages/react/README.md)** - React components & hooks
- 💚 **[Vue Docs](packages/vue/README.md)** - Vue 3 components & composables
- 📦 **[SDK Docs](sdk/README.md)** - TypeScript SDK reference
- 💡 **[Examples](examples/)** - Integration examples

## Examples in Action

Check out the [examples/](examples/) directory for:
- CDN embed demo
- React integration
- Vue integration
- iframe embedding

## Security

Docle implements enterprise-grade security features:

- ✅ **API Key Authentication** - Required for all code execution
- ✅ **Per-Key Rate Limiting** - Customizable limits (1-10,000 req/min)
- ✅ **IP-Based Rate Limiting** - Prevents abuse of public endpoints
- ✅ **Domain Restrictions** - Optional whitelist per API key
- ✅ **Request Size Limits** - Maximum 1MB per request
- ✅ **Security Headers** - CSP, X-Frame-Options, etc.
- ✅ **Secure Sessions** - HttpOnly cookies with 30-day expiration
- ✅ **Sandbox Isolation** - Memory and timeout limits

For detailed security documentation, see [SECURITY.md](./SECURITY.md).

## Documentation

- **[README.md](./README.md)** - Quick start and API overview (this file)
- **[DETAILED.md](./DETAILED.md)** - Comprehensive API documentation
- **[SECURITY.md](./SECURITY.md)** - Security features and best practices
- **[PRODUCTION.md](./PRODUCTION.md)** - Production deployment guide

## Contributing

We welcome contributions! Feel free to:
- Open issues for bugs or feature requests
- Submit PRs for improvements
- Share your use cases

## License

FSL-1.1-MIT - See [LICENSE](./LICENSE) for details.

---

**Built with ❤️ using [Cloudflare Workers](https://workers.cloudflare.com), [Cloudflare Sandbox](https://developers.cloudflare.com/sandbox/), and [Hono](https://hono.dev)**

**Questions?** Open an issue or check out the [detailed documentation](DETAILED.md).
