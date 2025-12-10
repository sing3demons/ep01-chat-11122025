# WhatsApp Chat Client Makefile

.PHONY: build run clean test deps help

# Default backend URL
BACKEND_URL ?= http://localhost:3001

# Build the application
build:
	@echo "🔨 Building chat client..."
	go build -o chat-client main.go
	@echo "✅ Build complete: ./chat-client"

# Run the application
run:
	@echo "🚀 Starting chat client..."
	go run main.go $(BACKEND_URL)

# Install dependencies
deps:
	@echo "📦 Installing dependencies..."
	go mod tidy
	go mod download

# Clean build artifacts
clean:
	@echo "🧹 Cleaning..."
	rm -f chat-client
	go clean

# Test build
test:
	@echo "🧪 Testing build..."
	go build -o /tmp/chat-client-test main.go
	rm -f /tmp/chat-client-test
	@echo "✅ Build test passed"

# Check if backend is running
check-backend:
	@echo "🔍 Checking backend at $(BACKEND_URL)..."
	@curl -s $(BACKEND_URL)/api/health > /dev/null && echo "✅ Backend is running" || echo "❌ Backend not responding"

# Start demo (requires 2 terminals)
demo:
	@echo "🎬 Demo Instructions:"
	@echo "1. Start backend: cd ../backend && npm start"
	@echo "2. Terminal 1: make run"
	@echo "3. Terminal 2: make run"
	@echo "4. Follow demo.md instructions"

# Help
help:
	@echo "WhatsApp Chat Client - Available Commands:"
	@echo ""
	@echo "  build         Build the chat client binary"
	@echo "  run           Run the chat client (default: localhost:3001)"
	@echo "  deps          Install Go dependencies"
	@echo "  clean         Clean build artifacts"
	@echo "  test          Test build process"
	@echo "  check-backend Check if backend is running"
	@echo "  demo          Show demo instructions"
	@echo "  help          Show this help message"
	@echo ""
	@echo "Examples:"
	@echo "  make run                                    # Use default backend"
	@echo "  make run BACKEND_URL=http://localhost:3001  # Custom backend URL"
	@echo "  make build && ./chat-client http://localhost:3001"