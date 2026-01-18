#!/bin/bash

# Swiss Ephemeris API Quick Test Script
# Usage: ./test.sh [url]

SERVICE_URL="${1:-http://localhost:3000}"

echo "═════════════════════════════════════════════════════"
echo "  Swiss Ephemeris API - Quick Test"
echo "═════════════════════════════════════════════════════"
echo "  Target: $SERVICE_URL"
echo "═════════════════════════════════════════════════════"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test 1: HTTP Health Check
echo ""
echo "📊 Test 1: HTTP Health Check"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/" 2>/dev/null)
if [ "$HTTP_STATUS" = "200" ]; then
  echo -e "${GREEN}✅ HTTP endpoint is accessible (Status: 200)${NC}"
else
  echo -e "${RED}❌ HTTP endpoint returned: $HTTP_STATUS${NC}"
fi

# Test 2: Socket.IO Endpoint
echo ""
echo "🔌 Test 2: Socket.IO Connection Test"
SOCKETJS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/socket.io/socket.io.js" 2>/dev/null)
if [ "$SOCKETJS_STATUS" = "200" ]; then
  echo -e "${GREEN}✅ Socket.IO client library accessible (Status: 200)${NC}"
else
  echo -e "${RED}❌ Socket.IO client library returned: $SOCKETJS_STATUS${NC}"
fi

# Test 3: Service Info
echo ""
echo "ℹ️  Test 3: Service Information"
echo "Service URL: $SERVICE_URL"

# Extract host and port
if [[ "$SERVICE_URL" =~ ^https?://([^:]+)(:([0-9]+))?$ ]]; then
  HOST="${BASH_REMATCH[1]}"
  PORT="${BASH_REMATCH[3]:-80}"
  echo "Host: $HOST"
  echo "Port: $PORT"
fi

# Test 4: Node.js Test (if available)
echo ""
echo "🧪 Test 4: Node.js API Test"
if command -v node &> /dev/null; then
  if [ -f "test-api.js" ]; then
    node test-api.js "$SERVICE_URL"
  else
    echo -e "${RED}❌ test-api.js not found${NC}"
  fi
else
  echo -e "${RED}⚠️  Node.js not installed, skipping API tests${NC}"
fi

echo ""
echo "═════════════════════════════════════════════════════"
echo "  Quick test completed!"
echo "═════════════════════════════════════════════════════"
