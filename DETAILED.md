# Docle Documentation

**Docle** is a secure code execution platform built on Cloudflare Workers that lets you run untrusted Python and Node.js code safely at the edge. Deploy interactive code playgrounds, educational platforms, AI agents, and more with a single API call.

## Table of Contents

1. [Overview](#overview)
2. [Core Features](#core-features)
3. [REST API Reference](#rest-api-reference)
4. [SDK & Framework Packages](#sdk--framework-packages)
5. [Embeddable Components](#embeddable-components)
6. [Security & Sandboxing](#security--sandboxing)
7. [Multi-File Projects](#multi-file-projects)
8. [Package Installation](#package-installation)
9. [Collaborative Editing](#collaborative-editing)
10. [Execution Policies](#execution-policies)
11. [Storage & History](#storage--history)
12. [Architecture](#architecture)
13. [Use Cases](#use-cases)
14. [Deployment Guide](#deployment-guide)
15. [Performance & Limits](#performance--limits)
16. [Troubleshooting](#troubleshooting)

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
    memoryMB?: number;     // 64-2048, default: 256
    allowNet?: boolean;    // default: false
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
      "memoryMB": 256,
      "allowNet": false
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
      "timeoutMs": 30000,
      "memoryMB": 512,
      "allowNet": false
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
    memoryMB: 256,
    allowNet: false
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
      memoryMB: 256,
      allowNet: false
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
- ❌ Network requests (unless `allowNet: true`)
- ❌ System calls
- ❌ Access to other executions
- ❌ Access to Workers bindings (KV, DO, R2, etc.)

### What's Allowed

- ✅ Full Python standard library
- ✅ Full Node.js standard library
- ✅ Third-party packages (pip/npm)
- ✅ File operations within `/workspace`
- ✅ Network requests (if `allowNet: true`)
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
  memoryMB: number;     // 64 - 2,048 MB
  allowNet: boolean;    // Enable network access
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

### Memory (memoryMB)

Controls maximum memory allocation.

- **Minimum:** 64 MB
- **Maximum:** 2,048 MB (2 GB)
- **Default:** 256 MB

**Note:** Memory limits are enforced at the sandbox level.

**Example:**

```javascript
{
  "policy": {
    "memoryMB": 512  // 512 MB
  }
}
```

### Network Access (allowNet)

Controls network connectivity.

- **Default:** `false` (disabled)
- **When enabled:** Code can make HTTP/HTTPS requests

**Example:**

```javascript
{
  "code": "import requests\nr = requests.get('https://api.github.com')\nprint(r.status_code)",
  "lang": "python",
  "packages": { "packages": ["requests"] },
  "policy": {
    "allowNet": true,  // Required for network requests
    "timeoutMs": 30000  // Allow time for network operations
  }
}
```

### Recommended Policies by Use Case

**Quick Scripts (default):**
```javascript
{ timeoutMs: 3000, memoryMB: 256, allowNet: false }
```

**Data Processing:**
```javascript
{ timeoutMs: 30000, memoryMB: 1024, allowNet: false }
```

**API Calls:**
```javascript
{ timeoutMs: 15000, memoryMB: 512, allowNet: true }
```

**Heavy Computation:**
```javascript
{ timeoutMs: 60000, memoryMB: 2048, allowNet: false }
```

**Educational/Untrusted Code:**
```javascript
{ timeoutMs: 5000, memoryMB: 128, allowNet: false }
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
  policy: { allowNet: true, timeoutMs: 10000 }
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
    "timeoutMs": 60000,  // Allow time for installation
    "memoryMB": 512
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
    "timeoutMs": 60000,
    "memoryMB": 512
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
- For network-dependent packages, set `allowNet: true`
- Use specific versions: `requests==2.31.0`

**Example:**

```json
{
  "packages": { "packages": ["requests==2.31.0"] },
  "policy": {
    "timeoutMs": 60000,
    "allowNet": true
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
    "allowNet": true,
    "timeoutMs": 15000  // Allow time for network operations
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
    "memoryMB": 1024  // or 2048 for heavy operations
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
