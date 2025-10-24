#!/bin/bash

# Docle API Test Examples
# Run this script to test all API endpoints

BASE_URL="http://localhost:8787"

echo "🧪 Testing Docle API..."
echo ""

# Test 1: Simple Python execution
echo "1️⃣  Testing Python execution..."
curl -s $BASE_URL/api/run -X POST -H "Content-Type: application/json" -d '{
  "code": "print(\"Hello from Docle!\")\nfor i in range(3):\n    print(f\"Count: {i}\")",
  "lang": "python",
  "policy": {"timeoutMs": 3000}
}' | jq .
echo ""

# Test 2: Node.js execution
echo "2️⃣  Testing Node.js execution..."
curl -s $BASE_URL/api/run -X POST -H "Content-Type: application/json" -d '{
  "code": "console.log(\"Hello from Node!\");\nfor(let i=0; i<3; i++) console.log(`Count: ${i}`);",
  "lang": "node",
  "policy": {"timeoutMs": 3000}
}' | jq .
echo ""

# Test 3: Multi-file Python project
echo "3️⃣  Testing multi-file execution..."
curl -s $BASE_URL/api/run -X POST -H "Content-Type: application/json" -d '{
  "files": [
    {"path": "main.py", "content": "from utils import greet\nprint(greet(\"Docle\"))"},
    {"path": "utils.py", "content": "def greet(name):\n    return f\"Hello, {name}!\""}
  ],
  "lang": "python",
  "policy": {"timeoutMs": 3000}
}' | jq .
echo ""

# Test 4: With package installation
echo "4️⃣  Testing package installation..."
curl -s $BASE_URL/api/run -X POST -H "Content-Type: application/json" -d '{
  "code": "import json\nprint(json.dumps({\"status\": \"ok\"}))",
  "lang": "python",
  "packages": {"packages": ["requests"]},
  "policy": {"timeoutMs": 10000}
}' | jq .
echo ""

# Test 5: Get run by ID (use ID from previous run)
echo "5️⃣  To test GET /api/run/:id, use an ID from above:"
echo "   curl http://localhost:8787/api/run/YOUR_RUN_ID_HERE | jq ."
echo ""

echo "✅ All tests complete!"
echo ""
echo "🌐 Open these URLs in your browser:"
echo "   • Playground: $BASE_URL/playground"
echo "   • Advanced: $BASE_URL/playground/advanced"
echo "   • Dashboard: $BASE_URL/dashboard"
echo "   • Embed Demo: $BASE_URL/../examples/cdn-demo.html"

