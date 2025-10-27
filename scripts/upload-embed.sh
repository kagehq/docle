#!/bin/bash

# Build and upload embed.js to Cloudflare Worker

set -e

echo "📦 Building embed script..."
cd embed
npm install
npm run build

echo "Uploading to Cloudflare KV..."
cd ..
npx wrangler kv:key put --binding=RUNS "embed.js" --path="embed/dist/embed.js"

echo "Embed script uploaded successfully!"
echo "Available at: https://api.docle.co/embed.js"

