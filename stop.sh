#!/bin/bash

# Stop all Docle servers and processes
# Usage: ./stop.sh

echo "🛑 Stopping all Docle servers..."

# Kill all node processes (force with -9)
echo "  → Killing node processes..."
killall -9 node 2>/dev/null || true

# Kill all workerd processes (wrangler's runtime)
echo "  → Killing workerd processes..."
killall -9 workerd 2>/dev/null || true
pkill -9 -f "workerd" 2>/dev/null || true

# Kill wrangler processes
echo "  → Killing wrangler processes..."
pkill -9 -f "wrangler" 2>/dev/null || true

# Kill nuxt processes
echo "  → Killing nuxt processes..."
pkill -9 -f "nuxt" 2>/dev/null || true

# Find and kill any processes on our ports
echo "  → Killing processes on ports 8787, 3000, 3001..."
for port in 8787 3000 3001; do
  pid=$(lsof -ti :$port 2>/dev/null)
  if [ ! -z "$pid" ]; then
    kill -9 $pid 2>/dev/null && echo "    ✓ Killed process on port $port (PID: $pid)"
  fi
done

# Kill any docle-related processes by path
echo "  → Killing docle-related processes..."
ps aux | grep -i "docle" | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null || true

# Wait a moment for cleanup
sleep 1

# Verify everything is stopped
echo ""
echo "🔍 Verification:"

# Check ports
if lsof -i :8787 -i :3000 -i :3001 2>/dev/null; then
  echo "  ⚠️  WARNING: Some processes still listening on ports"
else
  echo "  ✓ All ports clear (8787, 3000, 3001)"
fi

# Check for remaining docle processes
remaining=$(ps aux | grep -E "(node|workerd)" | grep -i docle | grep -v grep | wc -l)
if [ "$remaining" -gt 0 ]; then
  echo "  ⚠️  WARNING: $remaining docle processes still running:"
  ps aux | grep -E "(node|workerd)" | grep -i docle | grep -v grep
else
  echo "  ✓ No docle processes running"
fi

echo ""
echo "✅ Done! All Docle servers stopped."

