# Docle Web

Modern web interface for Docle built with Nuxt 3 and Tailwind CSS.

## Setup

```bash
# Install dependencies
npm install

# Start dev server (runs on port 3001)
npm run dev
```

## Features

**Unified Web App** - All features in one place:

- ✅ Beautiful dark-themed UI with Tailwind CSS
- ✅ Real-time code execution
- ✅ Single-file & multi-file support (toggle mode)
- ✅ Package installation (pip/npm)
- ✅ Execution history with localStorage
- ✅ Python & Node.js support
- ✅ Configurable timeouts, memory, and network access
- ✅ Collaborative sessions (when Durable Objects enabled)
- ✅ Dashboard for viewing history
- ✅ Proxy to Docle API running on port 8787

## Development

Make sure the Docle Worker is running on port 8787:

```bash
# In the root docle directory
npm run dev
```

Then start the Nuxt web app:

```bash
# In the web directory
npm run dev
```

Visit: http://localhost:3001

