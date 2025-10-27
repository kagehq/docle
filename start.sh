#!/bin/bash

# Docle - Start Everything
# This script starts both the API (Worker) and Playground (Nuxt)

echo "🚀 Starting Docle..."
echo ""

# Stop any existing processes using our stop script
if [ -f "./stop.sh" ]; then
  echo "🛑 Stopping existing processes..."
  ./stop.sh > /dev/null 2>&1
else
  # Fallback if stop.sh doesn't exist
  pkill -f "wrangler dev" 2>/dev/null
  pkill -f "nuxt dev" 2>/dev/null
  killall node 2>/dev/null || true
  killall workerd 2>/dev/null || true
fi
sleep 1

# Clean up local storage to avoid migration issues
echo "🧹 Cleaning local storage..."
rm -rf .wrangler/state 2>/dev/null

# Check if D1 database is initialized
if [ ! -f ".wrangler/state/v3/d1/miniflare-D1DatabaseObject" ]; then
  echo "🗄️  Initializing D1 database..."
  if [ -f "schema.sql" ]; then
    npx wrangler d1 execute DB --local --file=schema.sql > /dev/null 2>&1
    echo "  ✓ Database initialized"
  else
    echo "  ⚠️  Warning: schema.sql not found"
  fi
fi

# Build embed.js if needed
echo "📦 Building embed script..."
cd embed
if [ ! -d "node_modules" ]; then
  npm install --silent > /dev/null 2>&1
fi
npm run build > /dev/null 2>&1
cd ..
echo "  ✓ Embed script built"

# Upload embed.js to local KV
echo "📤 Uploading embed.js to local KV..."
npx wrangler kv:key put --binding=RUNS --local "embed.js" --path="embed/dist/embed.js" > /dev/null 2>&1 || true
echo "  ✓ Embed script ready"

# Start Worker API in background
echo "📡 Starting API (Worker) on port 8787..."
npm run dev > /tmp/docle-api.log 2>&1 &
API_PID=$!

# Wait for API to be ready
echo "  ⏳ Waiting for API to start..."
for i in {1..30}; do
  if curl -s http://localhost:8787/ > /dev/null 2>&1; then
    echo "  ✓ API is ready!"
    break
  fi
  sleep 1
done

# Start Nuxt Playground in background
echo "🎨 Starting Playground (Nuxt) on port 3001..."
cd playground && npm run dev > /tmp/docle-playground.log 2>&1 &
PLAYGROUND_PID=$!

# Wait for Nuxt to be ready
echo "  ⏳ Waiting for Nuxt to start..."
for i in {1..30}; do
  if curl -s http://localhost:3001/ > /dev/null 2>&1; then
    echo "  ✓ Playground is ready!"
    break
  fi
  sleep 1
done

echo ""
echo "✅ Docle is running!"
echo ""
echo "  📡 API:        http://localhost:8787"
echo "  🎨 Playground: http://localhost:3001"
echo "  🔑 Login:      http://localhost:3001/login"
echo ""
echo "📋 Logs:"
echo "  API:        tail -f /tmp/docle-api.log"
echo "  Playground: tail -f /tmp/docle-playground.log"
echo ""
echo "⏹️  To stop: ./stop.sh"
echo ""

# Keep script running and show combined logs
trap "pkill -P $$; exit" SIGINT SIGTERM

# Follow both logs
tail -f /tmp/docle-api.log /tmp/docle-playground.log

