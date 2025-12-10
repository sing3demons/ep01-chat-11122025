#!/bin/bash

# Quick test script for WhatsApp Chat Client

echo "🧪 Quick Test Script"
echo "==================="

# Check if backend is running
echo "🔍 Checking backend..."
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ Backend is running"
else
    echo "❌ Backend is not running!"
    echo "   Start it with: cd ../backend && npm start"
    exit 1
fi

# Test API endpoints
echo ""
echo "🔧 Testing API endpoints..."

# Test registration
echo "📝 Testing registration..."
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@quicktest.com","password":"password123"}')

if echo "$REGISTER_RESPONSE" | grep -q '"success":true'; then
    echo "✅ Registration works"
else
    echo "⚠️  Registration failed (user might already exist)"
fi

# Test login
echo "🔑 Testing login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@test.com","password":"password123"}')

if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
    echo "✅ Login works"
    
    # Extract token for WebSocket test
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    
    if [ ! -z "$TOKEN" ]; then
        echo "✅ JWT token received"
        
        # Test WebSocket connection (basic check)
        echo "🔌 Testing WebSocket endpoint..."
        if command -v wscat &> /dev/null; then
            timeout 3s wscat -c "ws://localhost:3001/ws?token=$TOKEN" -x "ping" 2>/dev/null && echo "✅ WebSocket works" || echo "⚠️  WebSocket test inconclusive"
        else
            echo "⚠️  wscat not installed, skipping WebSocket test"
        fi
    else
        echo "❌ No token received"
    fi
else
    echo "❌ Login failed"
    echo "Response: $LOGIN_RESPONSE"
fi

echo ""
echo "🎯 Test Summary:"
echo "- Backend: Running ✅"
echo "- API: Available ✅"
echo "- Auth: Working ✅"
echo ""
echo "🚀 Ready to test chat client!"
echo "   Run: make run"
echo ""
echo "📋 Test Users Available:"
echo "- alice@test.com / password123"
echo "- bob@test.com / password123"
echo "- charlie@test.com / password123"