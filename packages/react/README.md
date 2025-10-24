# @docle/react

React components for [Docle](https://github.com/yourusername/docle) - embeddable code execution powered by Cloudflare.

## Installation

```bash
npm install @docle/react
# or
yarn add @docle/react
# or
pnpm add @docle/react
```

## Components

### `<DoclePlayground />`

Embeddable code playground with iframe isolation.

```tsx
import { DoclePlayground } from '@docle/react';

function App() {
  return (
    <DoclePlayground
      lang="python"
      code="print('Hello, World!')"
      theme="dark"
      onRun={(result) => console.log(result)}
    />
  );
}
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `lang` | `'python'` \| `'node'` | `'python'` | Programming language |
| `theme` | `'dark'` \| `'light'` | `'dark'` | UI theme |
| `code` | `string` | `''` | Initial code |
| `readonly` | `boolean` | `false` | Make editor read-only |
| `showOutput` | `boolean` | `true` | Show output panel |
| `autorun` | `boolean` | `false` | Auto-run on mount |
| `height` | `string` \| `number` | `'400px'` | Component height |
| `width` | `string` \| `number` | `'100%'` | Component width |
| `endpoint` | `string` | `undefined` | Custom API endpoint |
| `onReady` | `(data) => void` | `undefined` | Callback when ready |
| `onRun` | `(result) => void` | `undefined` | Callback after execution |
| `onError` | `(error) => void` | `undefined` | Callback on error |
| `className` | `string` | `undefined` | Custom CSS class |
| `style` | `CSSProperties` | `undefined` | Custom styles |

#### Example: Interactive Tutorial

```tsx
import { useState } from 'react';
import { DoclePlayground } from '@docle/react';

function Tutorial() {
  const [step, setStep] = useState(0);
  
  const lessons = [
    { title: "Variables", code: "x = 42\nprint(x)" },
    { title: "Loops", code: "for i in range(5):\n    print(i)" },
    { title: "Functions", code: "def greet(name):\n    return f'Hello, {name}!'\n\nprint(greet('World'))" }
  ];

  return (
    <div>
      <h2>{lessons[step].title}</h2>
      <DoclePlayground
        lang="python"
        code={lessons[step].code}
        onRun={(result) => {
          if (result.ok) {
            setStep(s => Math.min(s + 1, lessons.length - 1));
          }
        }}
      />
    </div>
  );
}
```

---

### `useDocle()` Hook

Headless hook for programmatic code execution (no UI).

```tsx
import { useDocle } from '@docle/react';

function CustomEditor() {
  const { run, result, loading, error } = useDocle();
  const [code, setCode] = useState('print("Hello")');

  const handleRun = async () => {
    await run(code, { lang: 'python' });
  };

  return (
    <div>
      <textarea 
        value={code} 
        onChange={(e) => setCode(e.target.value)} 
      />
      <button onClick={handleRun} disabled={loading}>
        {loading ? 'Running...' : 'Run'}
      </button>
      {result && (
        <pre>{result.stdout || result.stderr}</pre>
      )}
      {error && (
        <div style={{ color: 'red' }}>Error: {error.message}</div>
      )}
    </div>
  );
}
```

#### Return Value

| Property | Type | Description |
|----------|------|-------------|
| `run` | `(code, options) => Promise<DocleResult>` | Execute code |
| `result` | `DocleResult \| null` | Last execution result |
| `loading` | `boolean` | Loading state |
| `error` | `Error \| null` | Error state |
| `reset` | `() => void` | Clear result/error |

#### Example: Code Validator

```tsx
import { useDocle } from '@docle/react';

function CodeValidator({ code, tests }) {
  const { run, result, loading } = useDocle();

  const validate = async () => {
    const testCode = `${code}\n\n${tests}`;
    const result = await run(testCode, { lang: 'python' });
    return result.ok && !result.stderr;
  };

  return (
    <button onClick={validate} disabled={loading}>
      {loading ? 'Validating...' : 'Run Tests'}
    </button>
  );
}
```

---

## Types

```typescript
interface DocleResult {
  id: string;
  ok: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  usage?: {
    cpuMs?: number;
    memMB?: number;
    durationMs?: number;
  };
  createdAt: string;
}

interface DocleRunOptions {
  lang: 'python' | 'node';
  policy?: {
    timeoutMs?: number;
    memoryMB?: number;
    allowNet?: boolean;
  };
  endpoint?: string;
}
```

---

## Configuration

### Custom Endpoint

Override the default Docle API endpoint:

```tsx
// Per-component
<DoclePlayground endpoint="https://your-docle.workers.dev" />

// Per-hook
const { run } = useDocle({ endpoint: "https://your-docle.workers.dev" });

// Globally
window.DOCLE_ENDPOINT = "https://your-docle.workers.dev";
```

### Styling

The `<DoclePlayground />` component is a simple wrapper. Style it like any React component:

```tsx
<DoclePlayground
  className="my-playground"
  style={{ 
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  }}
/>
```

---

## Examples

See the [examples directory](../../examples/react/) for complete examples:

- Basic usage
- Custom editor
- Interactive tutorials
- Code challenges
- Multi-language support

---

## License

MIT

---

## Links

- [Docle Documentation](../../README.md)
- [API Reference](../../README.md#api-reference)
- [Examples](../../examples/)
- [GitHub](https://github.com/yourusername/docle)

