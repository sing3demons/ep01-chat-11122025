#!/bin/bash

# WhatsApp Chat Client Runner Script

echo "🚀 WhatsApp Chat Client"
echo "======================="

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo "❌ Go is not installed. Please install Go first."
    exit 1
fi

# Check if backend URL is provided
if [ -z "$1" ]; then
    echo "📝 Usage: ./run.sh <backend-url>"
    echo "📝 Example: ./run.sh http://localhost:3001"
    echo ""
    echo "🔧 Using default: http://localhost:3001"
    BACKEND_URL="http://localhost:3001"
else
    BACKEND_URL="$1"
fi

# Install dependencies
echo "📦 Installing dependencies..."
go mod tidy

# Check if backend is running
echo "🔍 Checking backend connection..."
if curl -s "$BACKEND_URL/api/health" > /dev/null; then
    echo "✅ Backend is running at $BACKEND_URL"
else
    echo "⚠️  Warning: Cannot connect to backend at $BACKEND_URL"
    echo "   Make sure the backend server is running:"
    echo "   cd ../backend && npm start"
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "🎯 Starting chat client..."
echo "🔗 Backend URL: $BACKEND_URL"
echo ""

# Run the client
go run main.go "$BACKEND_URL"