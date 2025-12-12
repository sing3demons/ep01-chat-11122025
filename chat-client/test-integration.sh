#!/bin/bash

echo "🧪 Testing Go Chat Client Integration with Backend"
echo "=================================================="

# Test 1: Check if backend is running
echo "1. Checking backend health..."
if curl -s http://localhost:8080/health > /dev/null; then
    echo "✅ Backend is running"
else
    echo "❌ Backend is not running"
    exit 1
fi

# Test 2: Test registration
echo "2. Testing user registration..."
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }')

if echo "$REGISTER_RESPONSE" | grep -q "id"; then
    echo "✅ Registration successful"
else
    echo "⚠️ Registration may have failed (user might already exist)"
fi

# Test 3: Test login
echo "3. Testing user login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }')

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
    echo "✅ Login successful"
    TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')
    USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.user.id')
    echo "   Token: ${TOKEN:0:20}..."
    echo "   User ID: $USER_ID"
else
    echo "❌ Login failed"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

# Test 4: Test chat room creation
echo "4. Testing chat room creation..."
ROOM_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/chatrooms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Test Room",
    "type": "group",
    "participants": []
  }')

if echo "$ROOM_RESPONSE" | grep -q "id"; then
    echo "✅ Chat room created successfully"
    ROOM_ID=$(echo "$ROOM_RESPONSE" | jq -r '.id')
    echo "   Room ID: $ROOM_ID"
else
    echo "❌ Chat room creation failed"
    echo "Response: $ROOM_RESPONSE"
    exit 1
fi

# Test 5: Test listing chat rooms
echo "5. Testing chat room listing..."
ROOMS_RESPONSE=$(curl -s -X GET http://localhost:8080/api/v1/chatrooms \
  -H "Authorization: Bearer $TOKEN")

if echo "$ROOMS_RESPONSE" | grep -q "Test Room"; then
    echo "✅ Chat rooms listed successfully"
else
    echo "❌ Chat room listing failed"
    echo "Response: $ROOMS_RESPONSE"
fi

echo ""
echo "🎉 Integration tests completed!"
echo "You can now test the client manually with these credentials:"
echo "   Email: test@example.com"
echo "   Password: password123"
echo "   Room ID: $ROOM_ID"