#!/bin/bash

# Docle - Start Everything
# This script starts both the API (Worker) and Playground (Nuxt)

echo "🚀 Starting Docle..."
echo ""

# Kill any existing processes
pkill -f "wrangler dev" 2>/dev/null
pkill -f "nuxt dev" 2>/dev/null
sleep 1

# Clean up local Durable Objects storage to avoid migration issues
echo "🧹 Cleaning local storage..."
rm -rf .wrangler/state 2>/dev/null

# Start Worker API in background
echo "📡 Starting API (Worker) on port 8787..."
npx wrangler dev --port 8787 --local-protocol http > /tmp/docle-api.log 2>&1 &
API_PID=$!

# Wait for API to be ready
sleep 3

# Start Nuxt Playground in background
echo "🎨 Starting Playground (Nuxt) on port 3001..."
cd playground && npm run dev > /tmp/docle-playground.log 2>&1 &
PLAYGROUND_PID=$!

# Wait for Nuxt to be ready
sleep 5

echo ""
echo "✅ Docle is running!"
echo ""
echo "  📡 API:        http://localhost:8787"
echo "  🎨 Playground: http://localhost:3001"
echo ""
echo "📋 Logs:"
echo "  API:        tail -f /tmp/docle-api.log"
echo "  Playground: tail -f /tmp/docle-playground.log"
echo ""
echo "⏹️  To stop: pkill -f 'wrangler dev' && pkill -f 'nuxt dev'"
echo ""

# Keep script running and show combined logs
trap "pkill -P $$; exit" SIGINT SIGTERM

# Follow both logs
tail -f /tmp/docle-api.log /tmp/docle-playground.log

