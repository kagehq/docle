# CDN Distribution Guide

This guide explains how to build and distribute the `embed.js` CDN script.

## Overview

The CDN embed script allows users to add Docle playgrounds to any website with a simple script tag:

```html
<script src="https://api.docle.co/embed.js"></script>
<div data-docle>print("Hello, World!")</div>
```

## Distribution Options

### Option 1: Serve from Cloudflare Worker (Recommended)

The embed script is served directly from your Worker at `/embed.js`.

**Steps:**

1. **Build the embed script:**

```bash
cd embed
npm install
npm run build
```

This creates `embed/dist/embed.js`.

2. **Upload to Cloudflare KV:**

```bash
# From project root
npx wrangler kv:key put --binding=RUNS "embed.js" --path="embed/dist/embed.js"
```

Or use the helper script:

```bash
chmod +x scripts/upload-embed.sh
./scripts/upload-embed.sh
```

3. **Your embed script is now available at:**

```
https://api.docle.co/embed.js
https://YOUR-WORKER.workers.dev/embed.js
```

**Pros:**
- ✅ No external dependencies
- ✅ Same origin as your API
- ✅ Full control over caching
- ✅ Automatic CORS headers

**Cons:**
- ⚠️ Requires manual upload after changes
- ⚠️ Uses KV storage

---

### Option 2: Publish to npm + Use unpkg/jsdelivr

Publish the embed script as an npm package and use public CDNs.

**Steps:**

1. **Build the package:**

```bash
cd embed
npm install
npm run build
```

2. **Publish to npm:**

```bash
cd embed
npm login
npm publish --access public
```

3. **Users can then use:**

```html
<!-- via unpkg -->
<script src="https://unpkg.com/@doclehq/embed@latest/dist/embed.js"></script>

<!-- via jsdelivr -->
<script src="https://cdn.jsdelivr.net/npm/@doclehq/embed@latest/dist/embed.js"></script>
```

**Pros:**
- ✅ Automatic CDN distribution
- ✅ Version management
- ✅ No manual uploads
- ✅ Global CDN caching

**Cons:**
- ⚠️ Requires npm package maintenance
- ⚠️ External dependency

---

### Option 3: Bundle into Worker (Simplest for Development)

Bundle the embed script directly into your Worker code.

**Steps:**

1. **Build the embed script:**

```bash
cd embed
npm install
npm run build
```

2. **Inline the script in your Worker:**

```typescript
// src/index.ts
import embedScriptContent from '../embed/dist/embed.js?raw';

app.get("/embed.js", (c) => {
  return c.body(embedScriptContent, 200, {
    "Content-Type": "application/javascript",
    "Cache-Control": "public, max-age=86400",
    "Access-Control-Allow-Origin": "*"
  });
});
```

Note: This requires build tool configuration to import raw files.

**Pros:**
- ✅ No separate deployment
- ✅ Always in sync with Worker
- ✅ Simple

**Cons:**
- ⚠️ Increases Worker size
- ⚠️ Requires rebuild on embed changes

---

## Current Implementation

The current implementation uses **Option 1** (serve from Worker via KV).

The route is already configured in `src/index.ts`:

```typescript
app.get("/embed.js", async (c) => {
  const embedScript = c.env.EMBED_JS || await c.env.RUNS.get("embed.js");
  
  if (embedScript) {
    return c.body(embedScript, 200, {
      "Content-Type": "application/javascript",
      "Cache-Control": "public, max-age=86400",
      "Access-Control-Allow-Origin": "*"
    });
  }
  
  return c.text("Embed script not found", 404);
});
```

## Build Commands

```bash
# Build embed script
cd embed && npm run build

# Upload to production
./scripts/upload-embed.sh

# Or manually
npx wrangler kv:key put --binding=RUNS "embed.js" --path="embed/dist/embed.js"
```

## Testing

Test locally:

```bash
# 1. Build the embed script
cd embed && npm run build

# 2. Start the Worker
npm run dev

# 3. Test the endpoint
curl http://localhost:8787/embed.js
```

## Version Management

To version the embed script:

```bash
# Upload with version key
npx wrangler kv:key put --binding=RUNS "embed.js" --path="embed/dist/embed.js"
npx wrangler kv:key put --binding=RUNS "embed.v0.1.0.js" --path="embed/dist/embed.js"

# Users can then use specific versions
# https://api.docle.co/embed.v0.1.0.js
```

Add a route for versioned scripts:

```typescript
app.get("/embed.:version.js", async (c) => {
  const version = c.req.param("version");
  const embedScript = await c.env.RUNS.get(`embed.${version}.js`);
  // ... serve script
});
```

## Cache Strategy

The embed script is cached for 24 hours:

```typescript
"Cache-Control": "public, max-age=86400"
```

To bust cache after updates:
1. Upload new version to KV
2. Users can force refresh with `?v=timestamp`:
   ```html
   <script src="https://api.docle.co/embed.js?v=20241024"></script>
   ```

## Monitoring

Check if embed script is available:

```bash
curl -I https://api.docle.co/embed.js
```

Should return `200 OK` with `Content-Type: application/javascript`.

## Recommended: Option 2 (npm + CDN)

For production, we recommend **Option 2** (publish to npm):

1. More reliable (backed by npm's infrastructure)
2. Better caching (global CDN)
3. Version management built-in
4. No manual uploads needed

To switch to Option 2:

```bash
cd embed
npm publish --access public

# Update docs to use:
# https://unpkg.com/@doclehq/embed@latest/dist/embed.js
```

## Questions?

- **Why KV for Option 1?** KV is fast (edge-cached) and simple for static files.
- **Why not Workers Assets?** Workers Assets is better but requires more setup.
- **Can I use both?** Yes! Serve from your Worker AND publish to npm.

For more info, see:
- [Cloudflare KV Docs](https://developers.cloudflare.com/kv/)
- [unpkg CDN](https://unpkg.com/)
- [jsDelivr CDN](https://www.jsdelivr.com/)

