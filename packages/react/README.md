# @doclehq/react

React components for [Docle](https://github.com/kagehq/docle) - embeddable code execution powered by Cloudflare.

## Installation

```bash
npm install @doclehq/react
# or
yarn add @doclehq/react
# or
pnpm add @doclehq/react
```

## Components

### `<DoclePlayground />`

Embeddable code playground with iframe isolation.

```tsx
import { DoclePlayground } from '@doclehq/react';

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
| `endpoint` | `string` | `'https://api.docle.co'` | Custom API endpoint (use your proxy) |
| `apiKey` | `string` | `undefined` | ⚠️ **Deprecated** - Use server proxy instead |
| `onReady` | `(data) => void` | `undefined` | Callback when ready |
| `onRun` | `(result) => void` | `undefined` | Callback after execution |
| `onError` | `(error) => void` | `undefined` | Callback on error |
| `className` | `string` | `undefined` | Custom CSS class |
| `style` | `CSSProperties` | `undefined` | Custom styles |

#### Example: Interactive Tutorial

```tsx
import { useState } from 'react';
import { DoclePlayground } from '@doclehq/react';

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
import { useDocle } from '@doclehq/react';

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
import { useDocle } from '@doclehq/react';

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
  demo_mode?: boolean;          // Indicates if running in demo/public mode
  upgrade_message?: string;      // Message about rate limits or upgrading
}

interface DocleRunOptions {
  lang: 'python' | 'node';
  policy?: {
    timeoutMs?: number;
  };
  endpoint?: string;             // Your server proxy endpoint
  apiKey?: string;               // ⚠️ Deprecated - Use server proxy
}
```

---

## Configuration

### API Authentication

**⚠️ Security Warning:** Never expose API keys in client-side code! Choose one of these production patterns:

#### Pattern 1: useDocle Hook + Server Proxy (Recommended for Custom UI)

Build your own UI with the `useDocle` hook and proxy API calls through your server:

```tsx
// app/api/docle/api/run/route.ts (Next.js 13+ API Route)
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
import { useState } from 'react';

function MyEditor() {
  const { run, result, loading } = useDocle({ endpoint: '/api/docle' });
  const [code, setCode] = useState('print("Hello!")');

  return (
    <div>
      <textarea value={code} onChange={(e) => setCode(e.target.value)} />
      <button onClick={() => run(code, { lang: 'python' })} disabled={loading}>
        Run
      </button>
      {result && <pre>{result.stdout}</pre>}
    </div>
  );
}
```

#### Pattern 2: DoclePlayground + Domain Restrictions (Recommended for Quick UI)

Use the built-in playground component with domain-restricted API keys:

```tsx
import { DoclePlayground } from '@doclehq/react';

<DoclePlayground 
  lang="python"
  code="print('Hello!')"
  apiKey="sk_live_YOUR_API_KEY"  // Configure domain restrictions in dashboard
  onRun={(result) => console.log(result)}
/>
```

**Set up domain restrictions:**
1. Go to [app.docle.co](https://app.docle.co/login)
2. Create an API key
3. Add allowed domains (e.g., `yourdomain.com`, `*.yourdomain.com`)

**Get your API key:** Sign up at [app.docle.co/login](https://app.docle.co/login) and add it to your `.env.local`:

```bash
DOCLE_API_KEY=sk_live_YOUR_API_KEY
```

### Custom Endpoint

**Note:** The `endpoint` prop behavior differs between components:

**DoclePlayground Component:**
- Changes where the iframe embed loads from (for self-hosted Docle instances)
- Does NOT proxy API calls

```tsx
// For self-hosted Docle
<DoclePlayground endpoint="https://docle.yourcompany.com" />
```

**useDocle Hook:**
- Changes where API calls are sent (works with server proxies)
- Appends `/api/run` to the endpoint

```tsx
// With your server proxy
const { run } = useDocle({ endpoint: '/api/docle' });
// Makes: POST /api/docle/api/run

// Or globally
window.DOCLE_ENDPOINT = "https://api.docle.co";
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

FSL-1.1-MIT