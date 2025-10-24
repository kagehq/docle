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
| `endpoint` | `string` | `undefined` | Custom Docle API endpoint |

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

### With API Endpoint

```vue
<template>
  <DoclePlayground
    endpoint="https://your-docle-instance.workers.dev"
    lang="python"
  />
</template>
```

## License

FSL-1.1-MIT

