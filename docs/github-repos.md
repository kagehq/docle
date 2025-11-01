# GitHub Repository Support

Run code directly from GitHub repositories without cloning or downloading. Perfect for demos, documentation, and trying out example projects.

## Features

- ✅ Paste GitHub URL → instant execution
- ✅ Automatic language detection (Python/Node.js)
- ✅ Automatic entrypoint detection
- ✅ Automatic package installation (requirements.txt, package.json)
- ✅ Supports public repositories
- ✅ Works with all Docle SDKs (TypeScript, React, Vue)

## Supported URL Formats

```typescript
// Short format
"owner/repo"

// Full URL
"https://github.com/owner/repo"

// Specific branch
"https://github.com/owner/repo/tree/develop"

// Specific folder
"https://github.com/owner/repo/tree/main/examples/demo"
```

---

## Quick Start

### TypeScript SDK

```typescript
import { runSandbox } from '@doclehq/sdk';

const result = await runSandbox(null, {
  repo: 'octocat/Hello-World',
  apiKey: process.env.DOCLE_API_KEY
});

console.log(result.stdout);
```

### React Component

```tsx
import { DoclePlayground } from '@doclehq/react';

function Demo() {
  return (
    <DoclePlayground
      repo="octocat/Hello-World"
      apiKey={process.env.REACT_APP_DOCLE_API_KEY}
      autorun={true}
    />
  );
}
```

### Vue Component

```vue
<template>
  <DoclePlayground
    repo="octocat/Hello-World"
    :apiKey="apiKey"
    :autorun="true"
  />
</template>

<script setup>
import { DoclePlayground } from '@doclehq/vue';
const apiKey = import.meta.env.VITE_DOCLE_API_KEY;
</script>
```

### REST API

```bash
curl -X POST https://api.docle.co/api/run \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "repo": "octocat/Hello-World"
  }'
```

---

## How It Works

### 1. Automatic Language Detection

Docle analyzes the repository and detects the language:

**Python indicators:**
- `requirements.txt` or `setup.py` present
- More `.py` files than `.js` files

**Node.js indicators:**
- `package.json` present
- More `.js`/`.ts` files than `.py` files

You can override detection:
```typescript
repo: "owner/repo",
lang: "python"  // Force Python even if Node.js detected
```

### 2. Automatic Entrypoint Detection

Docle looks for common entrypoint files:

**Python:**
- `main.py`
- `app.py`
- `run.py`
- `__main__.py`
- `index.py`
- First `.py` file found

**Node.js:**
- `index.js`
- `main.js`
- `app.js`
- `server.js`
- `main` field from `package.json`
- First `.js`/`.ts` file found

You can specify a custom entrypoint:
```typescript
repo: "owner/repo",
entrypoint: "src/app.py"  // Custom entrypoint
```

### 3. Automatic Package Installation

Docle automatically installs dependencies:

**Python:** Reads `requirements.txt`
```python
# requirements.txt
requests==2.28.0
pandas==2.0.0
```

**Node.js:** Reads `package.json` dependencies
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "lodash": "^4.17.21"
  }
}
```

---

## Examples

### Example 1: Simple Python Script

```typescript
import { runSandbox } from '@doclehq/sdk';

// Run a simple Python hello world
const result = await runSandbox(null, {
  repo: 'github-username/python-hello-world',
  apiKey: process.env.DOCLE_API_KEY
});

console.log(result.stdout); // "Hello, World!"
```

### Example 2: Flask Application

```typescript
// Run a Flask app with dependencies
const result = await runSandbox(null, {
  repo: 'pallets/flask',
  entrypoint: 'examples/tutorial/hello.py',
  apiKey: process.env.DOCLE_API_KEY,
  policy: {
    timeoutMs: 15000 // Give more time for package installation
  }
});
```

### Example 3: React Component with Repo

```tsx
import { useState } from 'react';
import { DoclePlayground } from '@doclehq/react';

function GitHubDemoRunner() {
  const [repo, setRepo] = useState('octocat/Hello-World');

  return (
    <div>
      <input
        value={repo}
        onChange={(e) => setRepo(e.target.value)}
        placeholder="owner/repo"
      />
      <DoclePlayground
        repo={repo}
        apiKey={process.env.REACT_APP_DOCLE_API_KEY}
        onRun={(result) => console.log('Execution complete:', result)}
        onError={(error) => console.error('Error:', error)}
      />
    </div>
  );
}
```

### Example 4: Try Multiple Example Repos

```tsx
function ExamplesGallery() {
  const examples = [
    { name: 'Hello World', repo: 'octocat/Hello-World' },
    { name: 'Python Flask', repo: 'pallets/flask' },
    { name: 'Express.js', repo: 'expressjs/express' }
  ];

  const [selected, setSelected] = useState(examples[0]);

  return (
    <div>
      <div>
        {examples.map(ex => (
          <button key={ex.repo} onClick={() => setSelected(ex)}>
            {ex.name}
          </button>
        ))}
      </div>
      <DoclePlayground
        repo={selected.repo}
        apiKey={process.env.REACT_APP_DOCLE_API_KEY}
      />
    </div>
  );
}
```

### Example 5: Documentation with Live Demos

```tsx
// Perfect for documentation sites
function DocumentationExample() {
  return (
    <div>
      <h2>Installation Example</h2>
      <p>Here's how to use our library:</p>
      
      <DoclePlayground
        repo="your-org/your-library"
        entrypoint="examples/basic-usage.py"
        readonly={true}
        autorun={true}
        apiKey={process.env.REACT_APP_DOCLE_API_KEY}
      />
      
      <p>
        <a href="https://github.com/your-org/your-library" target="_blank">
          View full source on GitHub →
        </a>
      </p>
    </div>
  );
}
```

---

## Advanced Options

### Custom Branch

```typescript
{
  repo: "https://github.com/owner/repo/tree/develop"
}
```

### Specific Folder

```typescript
{
  repo: "https://github.com/owner/repo/tree/main/examples"
}
```

### Override All Defaults

```typescript
{
  repo: "owner/repo",
  lang: "python",
  entrypoint: "src/main.py",
  policy: {
    timeoutMs: 30000,
    allowNetwork: true,
    allowedHosts: ["api.github.com"]
  }
}
```

---

## Limits and Constraints

### File Limits
- **Max files:** 100 files per repository
- **Max file size:** 1MB per file
- **Allowed extensions:** `.py`, `.js`, `.ts`, `.json`, `.txt`, `.md`, `.jsx`, `.tsx`, `.mjs`, `.cjs`, `.yml`, `.yaml`, `.toml`, `.ini`, `.cfg`, `.conf`

### Package Limits
- **Max packages:** 20 packages (Python or Node.js)
- **Package timeout:** 60 seconds for installation

### Repository Requirements
- ✅ Must be **public** (private repos not supported yet)
- ✅ GitHub.com only (no GitLab/Bitbucket yet)
- ✅ Must contain valid Python or Node.js code

---

## Error Handling

### Repository Not Found

```typescript
{
  error: "Failed to load GitHub repository",
  message: "Repository not found: owner/repo. Make sure it's public."
}
```

**Solutions:**
- Check the repository exists
- Ensure it's public
- Verify the URL format

### Too Many Files

```typescript
{
  error: "Failed to load GitHub repository",
  message: "Too many files in repository (150). Maximum allowed: 100"
}
```

**Solutions:**
- Use a specific folder: `owner/repo/tree/main/subfolder`
- Remove unnecessary files from the repo
- Contact support for higher limits

### No Valid Files

```typescript
{
  error: "Failed to load GitHub repository",
  message: "No valid files found in repository. Check file extensions and sizes."
}
```

**Solutions:**
- Ensure repo contains `.py` or `.js` files
- Check file sizes (max 1MB per file)
- Verify file extensions are supported

---

## Use Cases

### 1. **Live Documentation**
Embed runnable examples directly in your docs

```tsx
<DoclePlayground
  repo="your-org/sdk-examples"
  entrypoint="getting-started.py"
  readonly={true}
/>
```

### 2. **Tutorial Series**
Let students run examples without setup

```tsx
const tutorials = [
  { title: "Variables", repo: "edu-org/python-101", file: "lesson1.py" },
  { title: "Functions", repo: "edu-org/python-101", file: "lesson2.py" }
];
```

### 3. **Code Review**
Test PRs before merging

```bash
curl -X POST https://api.docle.co/api/run \
  -d '{"repo": "https://github.com/owner/repo/tree/pr-123"}'
```

### 4. **Demo Gallery**
Showcase example projects

```tsx
<DoclePlayground
  repo="awesome-org/examples"
  entrypoint="demos/api-integration.js"
/>
```

### 5. **OSS Project Demos**
"Try before you clone"

```tsx
<DoclePlayground
  repo="your-oss-project/examples"
  autorun={true}
/>
```

---

## Security Considerations

### Network Access

By default, network is **blocked**. Enable selectively:

```typescript
{
  repo: "owner/repo",
  policy: {
    allowNetwork: true,
    allowedHosts: ["api.github.com", "*.your-api.com"]
  }
}
```

### Rate Limiting

- Uses your API key's rate limit
- Each repo fetch counts as 1 request
- File downloads are cached for 5 minutes

### Best Practices

✅ **DO:**
- Use specific branches/folders when possible
- Set reasonable timeouts (15-30 seconds)
- Enable network access only when needed
- Use read-only mode for documentation

❌ **DON'T:**
- Run untrusted repositories without review
- Give unlimited network access
- Use very large repositories (>100 files)

---

## FAQ

### Can I use private repositories?
Not yet. Private repository support is coming soon. Star the repo to get notified!

### What about GitLab or Bitbucket?
GitHub only for now. Other platforms coming based on demand.

### Can I specify a commit hash?
Not directly, but you can use branch names which point to specific commits.

### What if the repo has multiple entrypoints?
Specify the `entrypoint` parameter explicitly:
```typescript
{ repo: "owner/repo", entrypoint: "src/server.js" }
```

### Can I run a specific subdirectory?
Yes! Use the full URL:
```typescript
{ repo: "https://github.com/owner/repo/tree/main/examples/demo" }
```

### What about monorepos?
Point to the specific package folder:
```typescript
{ repo: "https://github.com/owner/monorepo/tree/main/packages/api" }
```

---

## Coming Soon

- ⏳ Private repository support (OAuth)
- ⏳ GitLab and Bitbucket support
- ⏳ Commit hash support
- ⏳ Repository caching (faster loads)
- ⏳ Binary file support
- ⏳ Larger file limits

---

## Related Documentation

- [Complete API Reference](DETAILED.md)
- [Network Access Controls](network-access.md)
- [TypeScript SDK](../sdk/README.md)
- [React Components](../packages/react/README.md)
- [Vue Components](../packages/vue/README.md)

---

## Support

Questions? Issues?
- [GitHub Issues](https://github.com/kagehq/docle/issues)
- [Discord Community](https://discord.gg/docle)
- Email: support@docle.co

