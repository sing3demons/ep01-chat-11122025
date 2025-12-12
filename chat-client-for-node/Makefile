# WhatsApp Chat Client Makefile

# Variables
BINARY_NAME=chat-client
MAIN_FILE=main.go
BUILD_DIR=build

# Default target
.PHONY: all
all: build

# Install dependencies
.PHONY: deps
deps:
	go mod tidy
	go mod download

# Build the application
.PHONY: build
build: deps
	go build -o $(BINARY_NAME) $(MAIN_FILE)

# Build for multiple platforms
.PHONY: build-all
build-all: deps
	mkdir -p $(BUILD_DIR)
	
	# Windows
	GOOS=windows GOARCH=amd64 go build -o $(BUILD_DIR)/$(BINARY_NAME)-windows.exe $(MAIN_FILE)
	
	# macOS
	GOOS=darwin GOARCH=amd64 go build -o $(BUILD_DIR)/$(BINARY_NAME)-macos $(MAIN_FILE)
	GOOS=darwin GOARCH=arm64 go build -o $(BUILD_DIR)/$(BINARY_NAME)-macos-arm64 $(MAIN_FILE)
	
	# Linux
	GOOS=linux GOARCH=amd64 go build -o $(BUILD_DIR)/$(BINARY_NAME)-linux $(MAIN_FILE)
	GOOS=linux GOARCH=arm64 go build -o $(BUILD_DIR)/$(BINARY_NAME)-linux-arm64 $(MAIN_FILE)

# Run the application
.PHONY: run
run: build
	./$(BINARY_NAME)

# Run with development server
.PHONY: dev
dev:
	go run $(MAIN_FILE)

# Clean build artifacts
.PHONY: clean
clean:
	rm -f $(BINARY_NAME)
	rm -rf $(BUILD_DIR)

# Test the application
.PHONY: test
test:
	go test -v ./...

# Format code
.PHONY: fmt
fmt:
	go fmt ./...

# Lint code
.PHONY: lint
lint:
	golangci-lint run

# Install the binary
.PHONY: install
install: build
	sudo cp $(BINARY_NAME) /usr/local/bin/

# Uninstall the binary
.PHONY: uninstall
uninstall:
	sudo rm -f /usr/local/bin/$(BINARY_NAME)

# Show help
.PHONY: help
help:
	@echo "Available targets:"
	@echo "  build      - Build the chat client"
	@echo "  build-all  - Build for all platforms"
	@echo "  run        - Build and run the client"
	@echo "  dev        - Run in development mode"
	@echo "  deps       - Install dependencies"
	@echo "  clean      - Clean build artifacts"
	@echo "  test       - Run tests"
	@echo "  fmt        - Format code"
	@echo "  lint       - Lint code"
	@echo "  install    - Install binary to /usr/local/bin"
	@echo "  uninstall  - Remove binary from /usr/local/bin"
	@echo "  help       - Show this help message"

# Quick start for development
.PHONY: quick-start
quick-start:
	@echo "🚀 Starting WhatsApp Chat Client..."
	@echo "📋 Make sure the backend server is running on localhost:3001"
	@echo "📡 Make sure the WebSocket server is running on localhost:3002"
	@echo ""
	$(MAKE) run