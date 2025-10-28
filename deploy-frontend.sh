#!/bin/bash

# Docle - Frontend Only Deployment
# Quick script to deploy just the frontend

echo "🎨 Building and Deploying Frontend to Production..."
echo ""

cd playground

echo "📦 Building..."
npm run generate

if [ $? -ne 0 ]; then
  echo "❌ Build failed!"
  exit 1
fi

echo ""
echo "🌐 Deploying to Pages..."
npx wrangler pages deploy .output/public --project-name=docle --commit-dirty=true

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Frontend deployed successfully!"
  echo "   URL: https://app.docle.co"
else
  echo "❌ Frontend deployment failed!"
  exit 1
fi

cd ..

