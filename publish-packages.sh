#!/bin/bash
set -e

echo "🚀 Publishing Docle packages to npm..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to publish a package
publish_package() {
  local package_dir=$1
  local package_name=$2
  
  echo -e "${BLUE}📦 Publishing ${package_name}...${NC}"
  cd "$package_dir"
  
  # Build the package
  echo "   Building..."
  npm run build
  
  # Publish to npm
  echo "   Publishing to npm..."
  npm publish --access public
  
  echo -e "${GREEN}✅ ${package_name} published successfully!${NC}"
  echo ""
  
  cd - > /dev/null
}

# Check if logged in to npm
echo "Checking npm login status..."
if ! npm whoami > /dev/null 2>&1; then
  echo -e "${RED}❌ Not logged in to npm. Please run 'npm login' first.${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Logged in to npm as $(npm whoami)${NC}"
echo ""

# Publish packages in correct order (SDK first, then others that depend on it)
publish_package "sdk" "@doclehq/sdk"
publish_package "packages/rate-limit" "@doclehq/rate-limit"
publish_package "packages/react" "@doclehq/react"
publish_package "packages/vue" "@doclehq/vue"

echo -e "${GREEN}🎉 All packages published successfully!${NC}"
echo ""
echo "Packages available at:"
echo "  - https://www.npmjs.com/package/@doclehq/sdk"
echo "  - https://www.npmjs.com/package/@doclehq/react"
echo "  - https://www.npmjs.com/package/@doclehq/vue"
echo "  - https://www.npmjs.com/package/@doclehq/rate-limit"

