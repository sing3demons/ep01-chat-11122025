#!/bin/bash

echo "🧪 Testing Chat Client Connection..."

# Build the client
echo "📦 Building client..."
go build -o chat-client main.go

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build successful"

# Test with existing user credentials
echo "🔐 Testing with existing user..."
echo "📝 Use these credentials:"
echo "   Email: test@example.com"
echo "   Password: SecurePassword123!"
echo ""
echo "🚀 Starting client..."

./chat-client http://localhost:3001