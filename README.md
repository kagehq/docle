# Docle

Run untrusted code safely, anywhere. Secure code execution service built on Cloudflare Workers + Sandbox.
Execute Python or Node.js code in isolated sandboxes with configurable policies for timeout, memory, and network access.

## Why Docle?

Every modern app runs code it didn’t write. AI-generated snippets, user automations, plugin systems, custom logic blocks. But running that code safely? It’s a nightmare.

Docle makes it instant. Add code execution to your app in 5 minutes. No servers, no docker, no complexity, no risk. Run your users’ code safely with one line.

```html
<!-- Literally one line -->
<script src="https://api.docle.co/embed.js"></script>
<div data-docle>print("Hello, World!")</div>
```

**That's it.** Your users can now run Python and Node.js code safely in your app.

**What makes it special:**
- **Edge-native** - Runs on Cloudflare's global network (<50ms latency)
- **Zero trust** - Isolated V8 sandboxes, no code ever touches your servers
- **Drop-in UI** - Beautiful code editor with syntax highlighting included
- **Framework agnostic** - Works with React, Vue, or vanilla JS
- **Collaborative** - Built-in real-time multi-user editing
- **Batteries included** - npm/pip packages, multi-file projects, history

**Use cases:** Educational platforms • AI agents • Code playgrounds • SaaS plugins • Live interviews


## Quick Start

### For Users (Live Demo)
Visit **https://app.docle.co** - Full playground with real code execution

### For Developers (Local Setup)
```bash
git clone https://github.com/kagehq/docle.git
cd docle

# Install dependencies
npm install
cd playground && npm install && cd ..

# Start servers (API + Playground)
./start.sh
```

Visit **http://localhost:3001** for playground
API runs on **http://localhost:8787**

**Note:** Cloudflare Sandbox containers only work in production. Local dev uses simulation mode.

## Usage

### REST API

```bash
curl -X POST https://api.docle.co/api/run \
  -H "Content-Type: application/json" \
  -d '{
    "code": "print(\"Hello, Docle!\")",
    "lang": "python",
    "policy": {"timeoutMs": 5000, "memoryMB": 256, "allowNet": false}
  }'
```

### TypeScript SDK

```bash
npm install @doclehq/sdk
```

```typescript
import { runSandbox } from '@doclehq/sdk';

const result = await runSandbox('print("Hello!")', { lang: 'python' });
console.log(result.stdout);
```

### React

```bash
npm install @doclehq/react
```

```tsx
import { DoclePlayground } from '@doclehq/react';

<DoclePlayground
  lang="python"
  code="print('Hello, React!')"
  onRun={(result) => console.log(result.stdout)}
/>
```

### Vue

```bash
npm install @doclehq/vue
```

```vue
<script setup>
import { DoclePlayground } from '@doclehq/vue';
</script>

<template>
  <DoclePlayground lang="python" code="print('Hello, Vue!')" />
</template>
```

### CDN Embed

```html
<script src="https://api.docle.co/embed.js"></script>
<div data-docle data-lang="python">
print("Hello, Docle!")
</div>
```

## Playgrounds

- **`/playground`** - Simple editor with syntax highlighting
- **`/playground/advanced`** - Multi-file editor with package installation
- **`/playground/collab`** - Real-time collaborative editing
- **`/dashboard`** - Execution history and metrics

## Features

- **Secure Isolation** - Cloudflare Sandbox with V8 isolates
- **REST API** - Simple HTTP endpoints
- **TypeScript SDK** - Type-safe client library
- **Embeddable** - iframe & CDN script for any website
- **React & Vue** - Native framework components
- **Multi-File Projects** - Execute complex projects, not just single scripts
- **Package Installation** - npm/pip support
- **Syntax Highlighting** - CodeMirror 6 editor
- **Collaborative Editing** - Real-time multi-user WebSocket sessions
- **Global Edge Network** - Fast execution worldwide
- **Package Installation** - Install npm/pip packages before execution
- **Execution History** - Track and replay previous runs (local + server)

## Production Deployment

### Requirements

- [Cloudflare account](https://dash.cloudflare.com/sign-up)
- Workers Paid plan (for Sandbox & Durable Objects)

### Deploy

```bash
# Create KV namespaces
npx wrangler kv namespace create RUNS
npx wrangler kv namespace create RUNS --env=preview

# Update wrangler.toml with generated IDs

# Deploy
npm run deploy
```

Your worker will be live at `https://docle.your-subdomain.workers.dev`

## Documentation

- **[FEATURES.md](FEATURES.md)** - Complete feature guide
- **[packages/react/README.md](packages/react/README.md)** - React components
- **[packages/vue/README.md](packages/vue/README.md)** - Vue components
- **[sdk/README.md](sdk/README.md)** - TypeScript SDK
- **[examples/](examples/)** - Integration examples

## Development

```bash
npm run dev        # Start local server
npm run deploy     # Deploy to Cloudflare
npm run typecheck  # Type checking
npm run format     # Format code
```

## License

FSL-1.1-MIT - See [LICENSE](./LICENSE) for details.

---

Built with ❤️ using [Cloudflare Workers](https://workers.cloudflare.com), [Cloudflare Sandbox](https://developers.cloudflare.com/sandbox/), and [Hono](https://hono.dev)
