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
| `endpoint` | `string` | `'https://app.docle.co'` | Base URL where embed page is hosted |
| `apiKey` | `string` | `undefined` | API key for authentication (requires domain restrictions) |
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
  endpoint?: string;             // API endpoint (defaults to https://api.docle.co)
  apiKey?: string;               // API key for authentication
  userContext?: {                // Optional user tracking context
    id: string;
    email?: string;
    name?: string;
    tier?: 'free' | 'pro' | 'enterprise';
    metadata?: Record<string, unknown>;
  };
}
```

---

## Security & Production Setup

**⚠️ Important:** API keys should be protected. Choose the appropriate pattern for your use case:

### Option 1: Domain-Restricted API Keys (Recommended for DoclePlayground)

Use `apiKey` with domain restrictions set in your [Docle dashboard](https://app.docle.co):

```tsx
import { DoclePlayground } from '@doclehq/react';
import { useEffect, useState } from 'react';

function App() {
  const [apiKey, setApiKey] = useState<string | null>(null);

  // Fetch API key from your backend
  useEffect(() => {
    fetch('/api/demo-key')
      .then(res => res.json())
      .then(data => setApiKey(data.apiKey));
  }, []);

  if (!apiKey) return <div>Loading...</div>;

  return (
    <DoclePlayground
      lang="python"
      code="print('Hello, World!')"
      apiKey={apiKey}
    />
  );
}
```

This is secure when you:
1. Set domain restrictions in your Docle dashboard
2. Limit the key to specific allowed domains
3. Fetch the key from your backend (don't hardcode it)

### Option 2: Server Proxy (For useDocle + Custom UI)

Build your own UI and proxy API calls through your backend:

```tsx
// app/api/docle/api/run/route.ts (Next.js 13+ App Router)
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
```

```tsx
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

### Understanding `endpoint`

The `endpoint` prop behaves differently for each component:

| Component | Default | Purpose | Example |
|-----------|---------|---------|---------|
| **DoclePlayground** | `https://app.docle.co` | Base URL for iframe embed page | `https://app.docle.co` |
| **useDocle** | `https://api.docle.co` | API endpoint for direct calls | `/api/docle` (your proxy) |

```tsx
// For self-hosted Docle embed
<DoclePlayground endpoint="https://docle.yourcompany.com" />

// For server proxy (appends /api/run automatically)
const { run } = useDocle({ endpoint: '/api/docle' });
// Makes: POST /api/docle/api/run
```

**Get your API key:** Sign up at [app.docle.co/login](https://app.docle.co/login)

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

## Troubleshooting

### Embed not loading / X-Frame-Options error

If you see a console error like `Refused to display 'https://app.docle.co/' in a frame because it set 'X-Frame-Options' to 'sameorigin'`:

1. **Make sure you're using the latest version:**
   ```bash
   npm install @doclehq/react@latest
   ```

2. **Don't specify the `endpoint` prop** - the default (`https://app.docle.co`) is already correct:
   ```tsx
   {/* ✅ Correct - uses default */}
   <DoclePlayground lang="python" code="print('Hello')" />
   
   {/* ❌ Not needed */}
   <DoclePlayground endpoint="https://app.docle.co" lang="python" />
   ```

3. **Clear your browser cache** with a hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+F5` (Windows)

### API key not working

Make sure you've set domain restrictions in your [Docle dashboard](https://app.docle.co) to allow your domain.

### Need help?

- [GitHub Issues](https://github.com/kagehq/docle/issues)
- [Discord Community](https://discord.gg/KqdBcqRk5E)

---

## License

FSL-1.1-MIT