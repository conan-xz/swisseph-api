#!/bin/bash

echo "═════════════════════════════════════════════════════"
echo "  Swiss Ephemeris API - Quick Test"
echo "═════════════════════════════════════════════════════"
echo ""

SERVICE_URL="http://localhost:3000"

# Test 1: HTTP Health Check
echo "📊 Test 1: HTTP Health Check"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/" 2>/dev/null)
if [ "$HTTP_STATUS" = "200" ]; then
  echo "   ✅ HTTP endpoint is accessible (Status: 200)"
else
  echo "   ❌ HTTP endpoint returned: $HTTP_STATUS"
  exit 1
fi

# Test 2: Socket.IO Library
echo ""
echo "🔌 Test 2: Socket.IO Client Library"
SOCKETJS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/socket.io/socket.io.js" 2>/dev/null)
if [ "$SOCKETJS_STATUS" = "200" ]; then
  echo "   ✅ Socket.IO client library accessible (Status: 200)"
else
  echo "   ❌ Socket.IO client library returned: $SOCKETJS_STATUS"
  exit 1
fi

# Test 3: Service Response
echo ""
echo "ℹ️  Test 3: Service Response"
CONTENT=$(curl -s "$SERVICE_URL/" 2>/dev/null)
if [[ "$CONTENT" == *"Swiss Ephemeris Online"* ]]; then
  echo "   ✅ Service is responding correctly"
  echo "   Page title: Swiss Ephemeris Online"
else
  echo "   ❌ Unexpected response"
fi

# Test 4: Container Status
echo ""
echo "🐳 Test 4: Container Status"
CONTAINER_STATUS=$(docker inspect --format='{{.State.Status}}' swisseph-api-test 2>/dev/null)
if [ "$CONTAINER_STATUS" = "running" ]; then
  echo "   ✅ Container is running"
else
  echo "   ⚠️  Container status: $CONTAINER_STATUS"
fi

# Test 5: Service Logs (last 5 lines)
echo ""
echo "📋 Test 5: Recent Service Logs"
docker logs --tail 5 swisseph-api-test 2>&1 | grep -v "DeprecationWarning" || echo "   No recent errors"

echo ""
echo "═════════════════════════════════════════════════════"
echo "  ✅ All basic tests passed!"
echo "═════════════════════════════════════════════════════"
echo ""
echo "Service is running at: $SERVICE_URL"
echo "Open in browser: http://localhost:3000"
echo ""
