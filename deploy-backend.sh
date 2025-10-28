#!/bin/bash

# Docle - Backend Only Deployment
# Quick script to deploy just the backend Worker

echo "📡 Deploying Backend API to Production..."
echo ""

npx wrangler deploy --env production

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Backend deployed successfully!"
  echo "   URL: https://api.docle.co"
  echo ""
  echo "💡 Monitor logs: npx wrangler tail --env production"
else
  echo "❌ Backend deployment failed!"
  exit 1
fi

