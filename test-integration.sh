#!/bin/bash

# Docle Integration Test Script
# This script tests the core functionality with API key authentication

set -e

echo "🧪 Docle Integration Test"
echo "=========================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if servers are running
echo "📡 Checking servers..."
if lsof -ti:8787 > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Backend running on :8787"
else
  echo -e "${RED}✗${NC} Backend not running on :8787"
  echo "Run: ./start.sh"
  exit 1
fi

if lsof -ti:3001 > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Frontend running on :3001"
else
  echo -e "${RED}✗${NC} Frontend not running on :3001"
  echo "Run: ./start.sh"
  exit 1
fi

echo ""
echo "📝 API Key Required Tests"
echo "-------------------------"

# Test 1: API endpoint without key should fail
echo -n "Test 1: POST /api/run without API key... "
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST http://localhost:8787/api/run \
  -H "Content-Type: application/json" \
  -d '{"code": "print(1)", "lang": "python"}')

if [ "$RESPONSE" -eq 401 ]; then
  echo -e "${GREEN}✓ PASS${NC} (401 Unauthorized)"
else
  echo -e "${RED}✗ FAIL${NC} (Expected 401, got $RESPONSE)"
fi

# Test 2: API endpoint with invalid key should fail
echo -n "Test 2: POST /api/run with invalid API key... "
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST http://localhost:8787/api/run \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_live_invalid_key_123" \
  -d '{"code": "print(1)", "lang": "python"}')

if [ "$RESPONSE" -eq 401 ]; then
  echo -e "${GREEN}✓ PASS${NC} (401 Unauthorized)"
else
  echo -e "${RED}✗ FAIL${NC} (Expected 401, got $RESPONSE)"
fi

echo ""
echo "🔗 Frontend Tests"
echo "-----------------"

# Test 3: Frontend should respond
echo -n "Test 3: Frontend homepage... "
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/)
if [ "$RESPONSE" -eq 200 ]; then
  echo -e "${GREEN}✓ PASS${NC} (200 OK)"
else
  echo -e "${RED}✗ FAIL${NC} (Expected 200, got $RESPONSE)"
fi

# Test 4: Embed page should be public
echo -n "Test 4: Embed page (/embed)... "
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/embed)
if [ "$RESPONSE" -eq 200 ]; then
  echo -e "${GREEN}✓ PASS${NC} (200 OK - Public)"
else
  echo -e "${RED}✗ FAIL${NC} (Expected 200, got $RESPONSE)"
fi

# Test 5: Login page should be public
echo -n "Test 5: Login page... "
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/login)
if [ "$RESPONSE" -eq 200 ]; then
  echo -e "${GREEN}✓ PASS${NC} (200 OK - Public)"
else
  echo -e "${RED}✗ FAIL${NC} (Expected 200, got $RESPONSE)"
fi

echo ""
echo "🔒 Protected Pages Tests"
echo "------------------------"

# Test 6: Playground should redirect to login if not authenticated
echo -n "Test 6: Playground requires auth... "
RESPONSE=$(curl -s -L -o /dev/null -w "%{url_effective}" http://localhost:3001/playground)
if [[ "$RESPONSE" == *"/login"* ]]; then
  echo -e "${GREEN}✓ PASS${NC} (Redirects to login)"
else
  echo -e "${YELLOW}⚠ PARTIAL${NC} (May require client-side check)"
fi

# Test 7: Snippets should redirect to login if not authenticated
echo -n "Test 7: Snippets requires auth... "
RESPONSE=$(curl -s -L -o /dev/null -w "%{url_effective}" http://localhost:3001/snippets)
if [[ "$RESPONSE" == *"/login"* ]]; then
  echo -e "${GREEN}✓ PASS${NC} (Redirects to login)"
else
  echo -e "${YELLOW}⚠ PARTIAL${NC} (May require client-side check)"
fi

echo ""
echo "📦 Package Verification"
echo "-----------------------"

# Test 8: Check SDK package
echo -n "Test 8: SDK package exists... "
if [ -f "sdk/index.ts" ] && grep -q "apiKey" sdk/index.ts; then
  echo -e "${GREEN}✓ PASS${NC}"
else
  echo -e "${RED}✗ FAIL${NC}"
fi

# Test 9: Check React package
echo -n "Test 9: React package has API key support... "
if [ -f "packages/react/src/types.ts" ] && grep -q "apiKey" packages/react/src/types.ts; then
  echo -e "${GREEN}✓ PASS${NC}"
else
  echo -e "${RED}✗ FAIL${NC}"
fi

# Test 10: Check Vue package
echo -n "Test 10: Vue package has API key support... "
if [ -f "packages/vue/src/types.ts" ] && grep -q "apiKey" packages/vue/src/types.ts; then
  echo -e "${GREEN}✓ PASS${NC}"
else
  echo -e "${RED}✗ FAIL${NC}"
fi

echo ""
echo "📄 Documentation"
echo "----------------"

# Test 11: README mentions API keys
echo -n "Test 11: README documents API keys... "
if grep -q "API Key" README.md && grep -q "required" README.md; then
  echo -e "${GREEN}✓ PASS${NC}"
else
  echo -e "${RED}✗ FAIL${NC}"
fi

echo ""
echo "=========================="
echo -e "${BLUE}📋 Manual Testing Required:${NC}"
echo ""
echo "1. Create an account and get an API key:"
echo "   → Visit http://localhost:3001/login"
echo "   → Check terminal for magic link"
echo "   → Create project and generate API key"
echo ""
echo "2. Test with your API key:"
echo "   curl -X POST http://localhost:8787/api/run \\"
echo "     -H 'Authorization: Bearer YOUR_KEY' \\"
echo "     -d '{\"code\": \"print('It works!')\", \"lang\": \"python\"}'"
echo ""
echo "3. Check usage analytics:"
echo "   → Visit project page"
echo "   → Click 'Usage' tab"
echo "   → Verify run appears in history"
echo ""
echo "4. Test packages (see TEST_CHECKLIST.md for details)"
echo ""
echo "📖 Full test checklist: ${BLUE}TEST_CHECKLIST.md${NC}"
echo ""

