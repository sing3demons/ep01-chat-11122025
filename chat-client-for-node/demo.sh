#!/bin/bash

# WhatsApp Chat Client Demo Script
# This script demonstrates the chat client functionality

echo "🚀 WhatsApp Chat Client Demo"
echo "============================"
echo ""

# Check if backend is running
echo "🔍 Checking backend server..."
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ Backend server is running on port 3001"
else
    echo "❌ Backend server is not running!"
    echo "Please start the backend server first:"
    echo "  cd backend && npm run dev"
    exit 1
fi

# Check if WebSocket server is accessible
echo "🔍 Checking WebSocket server..."
if nc -z localhost 3002 2>/dev/null; then
    echo "✅ WebSocket server is accessible on port 3002"
else
    echo "⚠️  WebSocket server might not be running on port 3002"
    echo "The client will still work in HTTP mode"
fi

echo ""
echo "🎯 Demo Options:"
echo "1. Interactive Demo (run the client)"
echo "2. API Test (test backend APIs)"
echo "3. Build Client (compile the Go client)"
echo "4. Show Examples"
echo ""

read -p "Choose option (1-4): " choice

case $choice in
    1)
        echo "🚀 Starting interactive chat client..."
        echo "Use the following test credentials:"
        echo "  Email: alice@test.com"
        echo "  Password: password123"
        echo ""
        echo "Or create a new account using option 2 (Register)"
        echo ""
        ./chat-client
        ;;
    2)
        echo "🧪 Testing Backend APIs..."
        echo ""
        
        # Test health endpoint
        echo "1. Testing health endpoint..."
        curl -s http://localhost:3001/api/health | jq '.' 2>/dev/null || curl -s http://localhost:3001/api/health
        echo ""
        
        # Test login with existing user
        echo "2. Testing login with test user..."
        LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
            -H "Content-Type: application/json" \
            -d '{"email":"alice@test.com","password":"password123"}')
        
        if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
            echo "✅ Login successful!"
            TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token' 2>/dev/null)
            if [ "$TOKEN" != "null" ] && [ "$TOKEN" != "" ]; then
                echo "🔑 JWT Token received: ${TOKEN:0:50}..."
                
                # Test authenticated endpoint
                echo ""
                echo "3. Testing authenticated endpoint (notifications)..."
                curl -s -H "Authorization: Bearer $TOKEN" \
                    http://localhost:3001/api/notifications | jq '.' 2>/dev/null || \
                curl -s -H "Authorization: Bearer $TOKEN" \
                    http://localhost:3001/api/notifications
                echo ""
                echo "✅ API tests completed successfully!"
            else
                echo "⚠️  Token extraction failed"
            fi
        else
            echo "❌ Login failed. Response:"
            echo "$LOGIN_RESPONSE"
            echo ""
            echo "💡 Try creating test users first:"
            echo "  cd backend && node create-test-user.js"
        fi
        ;;
    3)
        echo "🔨 Building chat client..."
        if go build -o chat-client main.go; then
            echo "✅ Build successful!"
            echo "📁 Binary created: ./chat-client"
            echo ""
            echo "🚀 You can now run: ./chat-client"
        else
            echo "❌ Build failed!"
            echo "Make sure Go is installed and dependencies are available"
            echo "Run: go mod tidy"
        fi
        ;;
    4)
        echo "📖 Chat Client Examples"
        echo "======================"
        echo ""
        echo "🔐 1. Login Flow:"
        echo "   ./chat-client"
        echo "   Choose: 1 (Login)"
        echo "   Email: alice@test.com"
        echo "   Password: password123"
        echo ""
        echo "⚡ 2. Realtime WebSocket Chat:"
        echo "   Choose: 1 (Connect to WebSocket)"
        echo "   /join room_123"
        echo "   /send Hello everyone!"
        echo "   /typing"
        echo "   /disconnect"
        echo ""
        echo "🌐 3. HTTP REST API:"
        echo "   Choose: 2 (Send HTTP Message)"
        echo "   Room ID: room_123"
        echo "   Message: Hello via HTTP!"
        echo ""
        echo "👥 4. Group Management:"
        echo "   Choose: 5 (Create Group)"
        echo "   Name: My Team"
        echo "   Participants: user1,user2,user3"
        echo ""
        echo "📜 5. View Chat History:"
        echo "   Choose: 3 (View Chat History)"
        echo "   Room ID: room_123"
        echo ""
        echo "For detailed examples, see: examples.md"
        ;;
    *)
        echo "❌ Invalid option"
        exit 1
        ;;
esac

echo ""
echo "🎉 Demo completed!"
echo ""
echo "📚 Additional Resources:"
echo "  - README.md: Full documentation"
echo "  - examples.md: Usage examples"
echo "  - Makefile: Build commands"
echo ""
echo "🔗 Backend URLs:"
echo "  - HTTP API: http://localhost:3001"
echo "  - WebSocket: ws://localhost:3002"
echo "  - Health Check: http://localhost:3001/api/health"