# @doclehq/vue

Vue 3 components for embedding Docle sandboxed code execution in your Vue applications.

## Installation

```bash
npm install @doclehq/vue
```

## Components

### `<DoclePlayground />`

A ready-to-use embedded playground component.

```vue
<script setup>
import { DoclePlayground } from '@doclehq/vue';

const handleReady = (data) => {
  console.log('Playground ready:', data);
};

const handleRun = (result) => {
  console.log('Code executed:', result);
};
</script>

<template>
  <DoclePlayground
    lang="python"
    code="print('Hello, Vue!')"
    theme="dark"
    height="400px"
    @ready="handleReady"
    @run="handleRun"
  />
</template>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `lang` | `'python' \| 'node'` | `'python'` | Programming language |
| `code` | `string` | `'print("Hello, Docle!")'` | Initial code content |
| `theme` | `'dark' \| 'light'` | `'dark'` | UI theme |
| `readonly` | `boolean` | `false` | Disable code editing |
| `showOutput` | `boolean` | `true` | Show output panel |
| `autorun` | `boolean` | `false` | Run code on mount |
| `height` | `string` | `'400px'` | Component height |
| `endpoint` | `string` | `'https://api.docle.co'` | Custom API endpoint (use your proxy) |
| `apiKey` | `string` | `undefined` | ⚠️ **Deprecated** - Use server proxy instead |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `ready` | `{ lang: string }` | Fired when playground is ready |
| `run` | `RunResult` | Fired when code execution completes |
| `error` | `{ message: string }` | Fired on execution error |

### Exposed Methods

```vue
<script setup>
import { ref } from 'vue';
import { DoclePlayground } from '@doclehq/vue';

const playgroundRef = ref(null);

const runCode = () => {
  playgroundRef.value?.run();
};

const updateCode = () => {
  playgroundRef.value?.setCode('print("Updated!")');
};
</script>

<template>
  <DoclePlayground ref="playgroundRef" />
  <button @click="runCode">Run</button>
  <button @click="updateCode">Update Code</button>
</template>
```

## Composables

### `useDocle()`

Headless composable for programmatic code execution.

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
    
    <div v-if="error">
      <h3>Error:</h3>
      <p>{{ error.message }}</p>
    </div>
  </div>
</template>
```

## TypeScript Support

Full TypeScript definitions included:

```typescript
import type {
  DoclePlaygroundProps,
  DocleRunResult,
  DocleEmitEvents,
  UseDocleOptions
} from '@doclehq/vue';
```

## Examples

### Basic Usage

```vue
<template>
  <DoclePlayground
    lang="python"
    code="for i in range(5):
    print(f'Count: {i}')"
  />
</template>
```

### Custom Styling

```vue
<template>
  <div class="playground-wrapper">
    <DoclePlayground
      lang="node"
      code="console.log('Hello, Node!');"
      theme="light"
      height="500px"
    />
  </div>
</template>

<style scoped>
.playground-wrapper {
  border: 2px solid #8aa2ff;
  border-radius: 12px;
  padding: 16px;
  background: #f5f5f5;
}
</style>
```

## Production Patterns

**⚠️ Security:** Never expose API keys in client-side code. Choose one of these patterns:

### Pattern 1: useDocle + Server Proxy (Custom UI)

Build your own UI and proxy API calls through your server:

```typescript
// server/api/docle/api/run.post.ts (Nuxt 3)
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

```vue
<script setup>
import { ref } from 'vue';
import { useDocle } from '@doclehq/vue';

const { run, result, loading } = useDocle({ endpoint: '/api/docle' });
const code = ref('print("Hello!")');

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

### Pattern 2: DoclePlayground + Domain Restrictions (Quick UI)

Use the built-in component with domain-restricted API keys:

```vue
<script setup>
import { DoclePlayground } from '@doclehq/vue';
</script>

<template>
  <DoclePlayground
    lang="python"
    code="print('Secure execution!')"
    api-key="sk_live_YOUR_API_KEY"
  />
</template>
```

**Set up domain restrictions** in your [Docle dashboard](https://app.docle.co) to limit key usage to your domains.

Add your API key to `.env`:
```bash
DOCLE_API_KEY=sk_live_YOUR_API_KEY
```

**Get your API key:** Sign up at [app.docle.co/login](https://app.docle.co/login)

---

### Endpoint Configuration

**Note:** The `endpoint` prop works differently:

- **DoclePlayground**: Changes iframe source (for self-hosted Docle)
- **useDocle**: Changes API call destination (works with proxies)

```vue
<!-- Self-hosted Docle -->
<DoclePlayground endpoint="https://docle.yourcompany.com" />

<!-- Server proxy -->
<script setup>
const { run } = useDocle({ endpoint: '/api/docle' });
// Makes: POST /api/docle/api/run
</script>
```

## License

FSL-1.1-MIT

