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
| `endpoint` | `string` | `'https://app.docle.co'` | Base URL where embed page is hosted |
| `apiKey` | `string` | `undefined` | API key for authentication (requires domain restrictions) |

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
      timeoutMs: 5000
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

## Security & Production Setup

**⚠️ Important:** API keys should be protected. Choose the appropriate pattern for your use case:

### Option 1: Domain-Restricted API Keys (Recommended for DoclePlayground)

Use `api-key` with domain restrictions set in your [Docle dashboard](https://app.docle.co):

```vue
<script setup>
import { DoclePlayground } from '@doclehq/vue';

// Fetch API key from your backend
const { data } = await useFetch('/api/demo-key');
</script>

<template>
  <DoclePlayground
    lang="python"
    code="print('Hello, World!')"
    :api-key="data.apiKey"
  />
</template>
```

This is secure when you:
1. Set domain restrictions in your Docle dashboard
2. Limit the key to specific allowed domains
3. Fetch the key from your backend (don't hardcode it)

### Option 2: Server Proxy (For useDocle + Custom UI)

Build your own UI and proxy API calls through your backend:

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
</script>

<template>
  <div>
    <textarea v-model="code" />
    <button @click="handleRun" :disabled="loading">Run</button>
    <pre v-if="result">{{ result.stdout }}</pre>
  </div>
</template>
```

### Understanding `endpoint`

The `endpoint` prop behaves differently for each component:

| Component | Default | Purpose | Example |
|-----------|---------|---------|---------|
| **DoclePlayground** | `https://app.docle.co` | Base URL for iframe embed page | `https://app.docle.co` |
| **useDocle** | `/api/run` | API endpoint for direct calls | `/api/docle/api/run` (your proxy) |

```vue
<!-- For self-hosted Docle embed -->
<DoclePlayground endpoint="https://docle.yourcompany.com" />

<!-- For server proxy -->
<script setup>
const { run } = useDocle({ endpoint: '/api/docle/api/run' });
</script>
```

**Get your API key:** Sign up at [app.docle.co/login](https://app.docle.co/login)

## Troubleshooting

### Embed not loading / X-Frame-Options error

If you see a console error like `Refused to display 'https://app.docle.co/' in a frame because it set 'X-Frame-Options' to 'sameorigin'`:

1. **Make sure you're using the latest version:**
   ```bash
   npm install @doclehq/vue@latest
   ```

2. **Don't specify the `endpoint` prop** - the default (`https://app.docle.co`) is already correct:
   ```vue
   <!-- ✅ Correct - uses default -->
   <DoclePlayground lang="python" code="print('Hello')" />
   
   <!-- ❌ Not needed -->
   <DoclePlayground endpoint="https://app.docle.co" lang="python" />
   ```

3. **Clear your browser cache** with a hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+F5` (Windows)

### API key not working

Make sure you've set domain restrictions in your [Docle dashboard](https://app.docle.co) to allow your domain.

### Need help?

- [GitHub Issues](https://github.com/kagehq/docle/issues)
- [Discord Community](https://discord.gg/KqdBcqRk5E)

## License

FSL-1.1-MIT

