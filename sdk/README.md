# @docle/sdk

One-line client for Docle's sandbox run API.

```bash
npm i @docle/sdk
```

```typescript
import { runSandbox } from "@docle/sdk";
const out = await runSandbox("print(42)", { lang: "python", policy: { timeoutMs: 2000 }});
console.log(out.stdout);
```
