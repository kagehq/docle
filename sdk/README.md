# @doclehq/sdk

TypeScript SDK for Docle's secure code execution API.

**⚠️ Server-Side Only:** This SDK should only be used in server-side environments (Node.js, Deno, Bun, Edge Functions). Never expose API keys in client-side code.

## Installation

```bash
npm install @doclehq/sdk
```

## Quick Start

```typescript
import { runSandbox } from "@doclehq/sdk";

const result = await runSandbox("print('Hello, Docle!')", { 
  lang: "python",
  apiKey: process.env.DOCLE_API_KEY  // Store in .env file
});

console.log(result.stdout);   // "Hello, Docle!\n"
console.log(result.ok);       // true
console.log(result.exitCode); // 0
```

**Note:** Get your API key at [app.docle.co/login](https://app.docle.co/login) and add it to your `.env` file.

## API Reference

### `runSandbox(code, options)`

Executes code in a secure sandbox.

**Parameters:**
- `code` (string): The code to execute
- `options` (object):
  - `lang` ('python' | 'node'): Programming language
  - `apiKey` (string): Your Docle API key (get one at [app.docle.co](https://app.docle.co/login))
  - `policy?` (object): Execution policy
    - `timeoutMs?` (number): Max execution time in milliseconds (default: 5000)
  - `endpoint?` (string): API endpoint (default: `/api/run`, or `window.DOCLE_ENDPOINT` if set)
  - `userContext?` (object): Optional user context for tracking
    - `id` (string): User identifier
    - `email?` (string): User email
    - `name?` (string): User name
    - `tier?` ('free' | 'pro' | 'enterprise'): User tier
    - `metadata?` (object): Additional metadata

**Returns:** `Promise<DocleResult>`

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
  demo_mode?: boolean;       // Indicates if running in demo/public mode
  upgrade_message?: string;  // Message about rate limits or upgrading
}
```

## Examples

### Basic Python Execution

```typescript
import { runSandbox } from "@doclehq/sdk";

const result = await runSandbox(
  `
  for i in range(5):
      print(f"Count: {i}")
  `,
  {
    lang: "python",
    apiKey: process.env.DOCLE_API_KEY
  }
);

console.log(result.stdout);
// Output:
// Count: 0
// Count: 1
// Count: 2
// Count: 3
// Count: 4
```

### Node.js Execution with Policy

```typescript
const result = await runSandbox(
  `
  console.log("Processing data...");
  const data = [1, 2, 3, 4, 5];
  console.log("Sum:", data.reduce((a, b) => a + b, 0));
  `,
  {
    lang: "node",
    apiKey: process.env.DOCLE_API_KEY,
    policy: {
      timeoutMs: 10000
    }
  }
);
```

### Error Handling

```typescript
const result = await runSandbox(
  "print(1/0)",  // Division by zero
  {
    lang: "python",
    apiKey: process.env.DOCLE_API_KEY
  }
);

if (!result.ok) {
  console.error("Execution failed:");
  console.error("Exit code:", result.exitCode);
  console.error("Error:", result.stderr);
}
```

### Using in Next.js API Route

```typescript
// app/api/execute/route.ts
import { runSandbox } from "@doclehq/sdk";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { code, lang } = await req.json();
  
  try {
    const result = await runSandbox(code, {
      lang,
      apiKey: process.env.DOCLE_API_KEY
    });
    
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Execution failed" },
      { status: 500 }
    );
  }
}
```

### Using in Nuxt 3 Server Route

```typescript
// server/api/execute.post.ts
import { runSandbox } from "@doclehq/sdk";

export default defineEventHandler(async (event) => {
  const { code, lang } = await readBody(event);
  
  return await runSandbox(code, {
    lang,
    apiKey: process.env.DOCLE_API_KEY
  });
});
```

## Security Best Practices

1. **Never expose API keys**: Always use environment variables and never commit them to version control
2. **Server-side only**: This SDK should only be used in server environments (Node.js, Deno, Bun, Edge Functions, etc.)
3. **Use domain restrictions**: Configure allowed domains in your [Docle dashboard](https://app.docle.co) for additional security
4. **Set appropriate policies**: Configure timeouts based on your use case (default: 5000ms)
5. **Handle errors gracefully**: Always check `result.ok` and handle `result.stderr` appropriately
6. **Validate user input**: Sanitize and validate code before execution to prevent abuse

## Getting an API Key

1. Sign up at [app.docle.co/login](https://app.docle.co/login)
2. Create a project
3. Generate an API key
4. Add it to your `.env` file:
   ```bash
   DOCLE_API_KEY=sk_live_YOUR_API_KEY
   ```

## Support

- Documentation: [github.com/kagehq/docle](https://github.com/kagehq/docle)
- Issues: [github.com/kagehq/docle/issues](https://github.com/kagehq/docle/issues)

## License

FSL-1.1-MIT
