#!/bin/bash

# Docle - Restart Everything
# This script stops all processes, cleans cache, and restarts cleanly

echo "Restarting Docle..."
echo ""

# Stop all processes
if [ -f "./stop.sh" ]; then
  ./stop.sh
else
  echo "stop.sh not found, skipping cleanup"
fi

echo ""
echo "⏳ Waiting 2 seconds before restart..."
sleep 2
echo ""

# Start everything
if [ -f "./start.sh" ]; then
  ./start.sh
else
  echo "Error: start.sh not found"
  exit 1
fi

