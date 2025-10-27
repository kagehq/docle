# Docle Examples

This directory contains integration examples for Docle. 

> ⚠️ **Security Notice**  
> These examples show API keys in client-side code for simplicity. **This is NOT recommended for production.**  
> For production apps, use server-side proxies as shown in the main [README](../README.md).

## What's Here

### [cdn-demo.html](./cdn-demo.html)
Zero-install CDN integration. Drop a script tag and start running code.

**Use case:** Quick prototypes, demos, learning

**Security:** ⚠️ API key exposed - use domain restrictions

### [react-demo.html](./react-demo.html)
React component integration using CDN (no build step needed).

**Use case:** Simple React apps, testing

**Security:** ⚠️ API key exposed - use domain restrictions

### [vue-demo.html](./vue-demo.html)
Vue component integration using CDN (no build step needed).

**Use case:** Simple Vue apps, testing

**Security:** ⚠️ API key exposed - use domain restrictions

### [embed-demo.html](./embed-demo.html)
iFrame embedding for complete isolation.

**Use case:** Embedding in external sites, sandboxed execution

**Security:** Uses postMessage to send API key securely

## Getting an API Key

1. Visit [app.docle.co/login](https://app.docle.co/login)
2. Sign up with your email (magic link, no password)
3. Create a project and generate an API key
4. **Set up domain restrictions** for any keys used client-side

## Production Patterns

These examples are for **learning and testing only**. For production:

### ✅ Recommended: Server Proxy

**Next.js:**
```typescript
// app/api/docle/route.ts
export async function POST(req: Request) {
  const { code, lang } = await req.json();
  
  const result = await fetch('https://api.docle.co/api/run', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.DOCLE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ code, lang })
  });
  
  return Response.json(await result.json());
}
```

**Client:**
```typescript
import { useDocle } from '@doclehq/react';

const { run } = useDocle({ endpoint: '/api/docle' });
```

### ✅ Alternative: Domain Restrictions

If you must use client-side API keys:
1. Go to your project dashboard
2. Add your domain to "Allowed Domains"
3. Use wildcard patterns: `*.yourdomain.com`
4. Monitor usage regularly

## Try Them Out

1. Clone this repo
2. Get an API key from [app.docle.co](https://app.docle.co)
3. Replace `YOUR_API_KEY` in the example files
4. Open the HTML files in your browser

## Next Steps

Ready to integrate Docle into your app? Check out:
- **[Main README](../README.md)** - Secure integration patterns
- **[React Docs](../packages/react/README.md)** - React components and hooks
- **[Vue Docs](../packages/vue/README.md)** - Vue components and composables
- **[SDK Docs](../sdk/README.md)** - TypeScript SDK for server-side

---

**Questions?** Open an issue or check the [detailed documentation](../DETAILED.md).
