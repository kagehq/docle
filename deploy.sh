#!/bin/bash

# Docle - Production Deployment Script
# This script deploys both backend (Worker) and frontend (Pages) to production

set -e  # Exit on any error

echo "🚀 Deploying Docle to Production"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================================================
# 1. Deploy Backend (Cloudflare Worker)
# ============================================================================
echo "${BLUE}📡 Deploying Backend API...${NC}"
echo ""

npx wrangler deploy --env production

if [ $? -eq 0 ]; then
  echo ""
  echo "${GREEN}✓ Backend deployed successfully!${NC}"
  echo "  URL: https://api.docle.co"
else
  echo "❌ Backend deployment failed!"
  exit 1
fi

echo ""
echo "⏳ Waiting 3 seconds for backend to stabilize..."
sleep 3
echo ""

# ============================================================================
# 2. Build & Deploy Frontend (Cloudflare Pages)
# ============================================================================
echo "${BLUE}🎨 Building Frontend...${NC}"
echo ""

cd web
npm run build

if [ $? -eq 0 ]; then
  echo ""
  echo "${GREEN}✓ Frontend built successfully!${NC}"
else
  echo "❌ Frontend build failed!"
  exit 1
fi

echo ""
echo "${BLUE}🌐 Deploying Frontend to Pages...${NC}"
echo ""

npx wrangler pages deploy dist --project-name=docle --commit-dirty=true

if [ $? -eq 0 ]; then
  echo ""
  echo "${GREEN}✓ Frontend deployed successfully!${NC}"
  echo "  URL: https://app.docle.co"
else
  echo "❌ Frontend deployment failed!"
  exit 1
fi

cd ..

# ============================================================================
# Summary
# ============================================================================
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "${GREEN}✅ Deployment Complete!${NC}"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "🔗 Production URLs:"
echo "  • Backend API:  https://api.docle.co"
echo "  • Frontend App: https://app.docle.co"
echo ""
echo "📊 Next Steps:"
echo "  1. Test login at https://app.docle.co/login"
echo "  2. Create a project and generate API keys"
echo "  3. Monitor logs: npx wrangler tail --env production"
echo ""
echo "════════════════════════════════════════════════════════════════"

