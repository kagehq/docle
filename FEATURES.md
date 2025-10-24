# Docle Features Documentation

## Table of Contents

1. [Embeddable SDK](#embeddable-sdk)
2. [Framework Components](#framework-components)
3. [Advanced Editor Features](#advanced-editor-features)
4. [Multi-File Projects](#multi-file-projects)
5. [Package Installation](#package-installation)
6. [Collaborative Editing](#collaborative-editing)

---

## Embeddable SDK

Add interactive code playgrounds to any website with zero configuration.

### CDN Embed (Recommended)

```html
<!-- Load once -->
<script src="https://docle.workers.dev/embed.js"></script>

<!-- Use anywhere -->
<div data-docle data-lang="python">
print("Hello, Docle!")
for i in range(5):
    print(f"Count: {i}")
</div>
```

### iframe Embed

```html
<iframe 
  src="https://docle.workers.dev/embed?lang=python&code=print('Hello')"
  width="100%" 
  height="400"
></iframe>
```

### Embed Options

- `data-lang` or `?lang=` - `python` | `node` (default: `python`)
- `data-theme` or `?theme=` - `dark` | `light` (default: `dark`)
- `data-code` or `?code=` - Initial code (URL-encoded for iframe)
- `data-readonly` or `?readonly=` - Disable editing (default: `false`)
- `data-height` - Custom height (e.g., `300px`, default: `400px`)
- `?autorun=true` - Auto-execute on load

### PostMessage API

```javascript
// Listen to results
window.addEventListener('message', (e) => {
  if (e.data.type === 'docle-result') {
    console.log('Result:', e.data.data);
  }
});

// Control the embed
iframe.contentWindow.postMessage({ type: 'docle-run' }, '*');
iframe.contentWindow.postMessage({ 
  type: 'docle-set-code', 
  code: 'print("New code!")' 
}, '*');
```

---

## Framework Components

### React

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
      height="400px"
      onRun={(result) => {
        console.log('Output:', result.stdout);
      }}
    />
  );
}
```

**Headless Hook:**

```tsx
import { useDocle } from '@doclehq/react';
import { useState } from 'react';

function CustomEditor() {
  const { run, result, loading, error } = useDocle();
  const [code, setCode] = useState('print("Hello")');

  const handleRun = async () => {
    await run(code, { lang: 'python' });
  };

  return (
    <div>
      <textarea value={code} onChange={(e) => setCode(e.target.value)} />
      <button onClick={handleRun} disabled={loading}>
        {loading ? 'Running...' : 'Run'}
      </button>
      {result && <pre>{result.stdout}</pre>}
      {error && <div>Error: {error.message}</div>}
    </div>
  );
}
```

**Full Documentation:** [packages/react/README.md](packages/react/README.md)

### Vue 3

**Installation:**

```bash
npm install @doclehq/vue
```

**Component Usage:**

```vue
<script setup>
import { DoclePlayground } from '@doclehq/vue';

const handleRun = (result) => {
  console.log('Output:', result.stdout);
};
</script>

<template>
  <DoclePlayground
    lang="python"
    code="print('Hello, Vue!')"
    @run="handleRun"
  />
</template>
```

**Composable (Headless):**

```vue
<script setup>
import { ref } from 'vue';
import { useDocle } from '@doclehq/vue';

const { run, result, loading, error } = useDocle();
const code = ref('print("Hello!")');

const handleRun = async () => {
  await run(code.value, {
    lang: 'python',
    policy: { timeoutMs: 5000, memoryMB: 256, allowNet: false }
  });
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

**Full Documentation:** [packages/vue/README.md](packages/vue/README.md)

---

## Advanced Editor Features

### Syntax Highlighting (CodeMirror 6)

Professional code editor with syntax highlighting for Python and Node.js.

**Features:**
- Real-time syntax highlighting
- Language-specific completions
- Dark theme optimized for readability
- Line numbers and code folding
- Auto-indentation

Available in:
- `/playground` - Simple playground
- `/playground/advanced` - Advanced multi-file editor

### Execution History

Track and replay previous code executions.

**Storage:**
- **Local:** localStorage (last 50 runs)
- **Server:** KV namespace (7-day retention)

**Features:**
- Click to load previous code
- Timestamp and language indicators
- Code preview in history list
- Clear history option

---

## Multi-File Projects

Execute projects with multiple files, not just single scripts.

### API Usage

```bash
curl -X POST https://docle.workers.dev/api/run \
  -H "Content-Type: application/json" \
  -d '{
    "files": [
      {"path": "main.py", "content": "from utils import greet\ngreet(\"World\")"},
      {"path": "utils.py", "content": "def greet(name):\n    print(f\"Hello, {name}!\")"}
    ],
    "entrypoint": "main.py",
    "lang": "python",
    "policy": {"timeoutMs": 10000, "memoryMB": 256, "allowNet": false}
  }'
```

### UI Features

Available at `/playground/advanced`:
- File tree sidebar
- Tab-based file switching
- Add/remove files dynamically
- File content persistence
- Session save/load

### Example: Python Multi-File Project

```python
# main.py
from calculator import Calculator
from logger import log

calc = Calculator()
result = calc.add(5, 3)
log(f"Result: {result}")
```

```python
# calculator.py
class Calculator:
    def add(self, a, b):
        return a + b
```

```python
# logger.py
def log(message):
    print(f"[LOG] {message}")
```

---

## Package Installation

Install third-party packages before code execution.

### Python Example

```json
{
  "files": [{"path": "main.py", "content": "import requests\nr = requests.get('https://api.github.com')\nprint(r.status_code)"}],
  "packages": { "packages": ["requests", "pandas==2.0.0"] },
  "lang": "python",
  "policy": {"timeoutMs": 30000, "memoryMB": 512, "allowNet": true}
}
```

### Node.js Example

```json
{
  "files": [{"path": "main.js", "content": "const _ = require('lodash');\nconsole.log(_.chunk([1,2,3,4], 2));"}],
  "packages": { "packages": ["lodash@4.17.21", "axios"] },
  "lang": "node",
  "policy": {"timeoutMs": 30000, "memoryMB": 512, "allowNet": false}
}
```

### Package Installation Process

1. Creates `requirements.txt` (Python) or `package.json` (Node)
2. Runs `pip3 install` or `npm install`
3. If installation fails, returns error without executing code
4. Installation timeout: max 60 seconds

### UI Features

Available at `/playground/advanced`:
- Package input with add/remove
- Visual list of installed packages
- Installation error feedback
- Version specification support

---

## Collaborative Editing

Real-time multi-user editing powered by Durable Objects and WebSockets.

### Creating a Session

```
1. Visit /playground/collab
2. Get redirected to /playground/collab/{sessionId}
3. Share the URL with collaborators
```

### Features

- Real-time code synchronization
- Multiple users per session
- User presence indicators with colors
- Session-based URLs (shareable links)
- Automatic reconnection
- Last-write-wins conflict resolution

### WebSocket Messages

**Client → Server:**

```typescript
// Update code
{ type: 'update', userId: '...', data: { code: '...', lang: 'python' } }

// Update cursor position
{ type: 'cursor', userId: '...', data: { cursor: 42 } }

// Request sync
{ type: 'sync' }
```

**Server → Client:**

```typescript
// Initial state
{ type: 'init', userId: '...', data: { code: '...', lang: '...', users: [...] } }

// User joined
{ type: 'join', userId: '...', data: { name: '...', color: '#...' } }

// User left
{ type: 'leave', userId: '...' }

// Code updated
{ type: 'update', userId: '...', data: { code: '...', lang: '...' }, timestamp: ... }
```

### Architecture

```
Client (WebSocket) ←→ Cloudflare Worker ←→ Durable Object (Session State)
                                                      ↓
                                              KV Storage (Persistence)
```

### Durable Object State

```typescript
{
  code: string;
  lang: 'python' | 'node';
  users: Map<userId, { name: string, cursor?: number, color: string }>;
  lastUpdate: number;
}
```

### Deployment Notes

Collaborative editing requires:
1. **Durable Objects** (configured in `wrangler.toml`)
2. **Workers Paid Plan** (for production WebSockets)
3. Deploy with `npm run deploy`

**Local testing** has limited WebSocket support in `--local` mode. For full testing, deploy to Cloudflare.

---

## Troubleshooting

### Durable Objects Not Working

**Issue:** "Collaborative editing not available"

**Solution:**
1. Ensure `wrangler.toml` has Durable Objects binding
2. Deploy to Cloudflare (not `--local`)
3. Verify Workers Paid plan is active

### Package Installation Fails

**Issue:** "Package installation failed"

**Solution:**
1. Check package name spelling
2. Increase `timeoutMs` to 30000+
3. Verify `allowNet: true` for external packages
4. Use specific versions: `requests==2.31.0`

### WebSocket Connection Drops

**Issue:** Frequent disconnections

**Solution:**
1. Check network stability
2. Verify Cloudflare Workers Paid plan
3. Enable auto-reconnect (built-in after 3s)

---

## Performance Considerations

### Package Installation
- **Timeout:** Max 60 seconds
- **Caching:** Packages cached in sandbox filesystem (within session)
- **Optimization:** Use specific versions to avoid latest lookups

### Collaborative Editing
- **Latency:** <100ms for code updates (Cloudflare edge)
- **Scale:** 10+ concurrent users per session
- **Storage:** Durable Objects with automatic persistence

### Execution History
- **localStorage:** Instant access, 50 item limit
- **Server:** 7-day retention, unlimited items

---

## License

MIT © Docle Team

