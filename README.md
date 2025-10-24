# Docle

**Run untrusted code safely.** Execute Python and Node.js code in secure sandboxes at the edge. No servers, no Docker, no complexity.

## Why?

Modern apps need to run code they didn't write—AI-generated scripts, user automations, plugins, custom logic. But doing it safely is hard.

Docle makes it simple. Add a one-line script tag and you're done:

```html
<script src="https://api.docle.co/embed.js"></script>
<div data-docle>print("Hello, World!")</div>
```

That's it. Your users can now run Python and Node.js code safely in your app.

## What You Get

- ⚡ **Fast** - Runs on Cloudflare's edge (<50ms latency)
- 🔒 **Secure** - Isolated V8 sandboxes, no access to your infrastructure
- 🎨 **Beautiful UI** - Code editor with syntax highlighting included
- 📦 **Full-featured** - npm/pip packages, multi-file projects, real-time collaboration
- 🌐 **Works everywhere** - React, Vue, vanilla JS, or pure REST API

**Perfect for:** Educational platforms • AI agents • Code playgrounds • SaaS plugins • Live interviews

## Quick Start

### Try it Now

Visit [app.docle.co](https://app.docle.co) for a live playground with real code execution.

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

### 1. REST API

```bash
curl -X POST https://api.docle.co/api/run \
  -H "Content-Type: application/json" \
  -d '{
    "code": "print(\"Hello, Docle!\")",
    "lang": "python"
  }'
```

### 2. TypeScript SDK

```typescript
import { runSandbox } from '@doclehq/sdk';

const result = await runSandbox('print("Hello!")', { lang: 'python' });
console.log(result.stdout);
```

### 3. React

```tsx
import { DoclePlayground } from '@doclehq/react';

<DoclePlayground
  lang="python"
  code="print('Hello, React!')"
  onRun={(result) => console.log(result.stdout)}
/>
```

### 4. Vue 3

```vue
<script setup>
import { DoclePlayground } from '@doclehq/vue';
</script>

<template>
  <DoclePlayground lang="python" code="print('Hello, Vue!')" />
</template>
```

### 5. CDN Embed

```html
<script src="https://api.docle.co/embed.js"></script>
<div data-docle data-lang="python">
print("Hello, Docle!")
</div>
```

## Key Features

- ✅ **Python 3** and **Node.js** support
- ✅ Install **npm/pip packages** before execution
- ✅ **Multi-file projects** with custom entry points
- ✅ **Real-time collaboration** with WebSocket-powered editing
- ✅ **Execution history** stored for 7 days
- ✅ **Configurable policies** (timeout, memory, network access)
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
