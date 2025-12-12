# Go parameters
GOCMD=go
GOBUILD=$(GOCMD) build
GOCLEAN=$(GOCMD) clean
GOTEST=$(GOCMD) test
GOGET=$(GOCMD) get
GOMOD=$(GOCMD) mod
BINARY_NAME=server
BINARY_UNIX=$(BINARY_NAME)_unix

# Build the application
build:
	$(GOBUILD) -o $(BINARY_NAME) -v ./cmd/server

# Build for Linux
build-linux:
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 $(GOBUILD) -o $(BINARY_UNIX) -v ./cmd/server

# Clean build files
clean:
	$(GOCLEAN)
	rm -f $(BINARY_NAME)
	rm -f $(BINARY_UNIX)

# Run tests
test:
	$(GOTEST) -v ./...

# Run tests with coverage
test-coverage:
	$(GOTEST) -v -coverprofile=coverage.out ./...
	$(GOCMD) tool cover -html=coverage.out -o coverage.html

# Run unit tests only
test-unit:
	$(GOTEST) -v ./tests/unit/...

# Run integration tests only
test-integration:
	$(GOTEST) -v ./tests/integration/...

# Tidy dependencies
tidy:
	$(GOMOD) tidy

# Download dependencies
deps:
	$(GOMOD) download

# Run the application
run:
	JWT_SECRET=development-jwt-secret-key-12345 REDIS_PASSWORD= ./$(BINARY_NAME)

# Run with hot reload (requires air)
dev:
	air

# Start database services
db-up:
	docker-compose up -d postgres redis

# Stop database services
db-down:
	docker-compose down

# Reset database
db-reset:
	docker-compose down
	docker-compose up -d postgres redis
	sleep 5
	docker exec backend-go-postgres-1 psql -U postgres -c "DROP DATABASE IF EXISTS whatsapp_chat_go; CREATE DATABASE whatsapp_chat_go;"

# Run migrations
migrate:
	JWT_SECRET=development-jwt-secret-key-12345 REDIS_PASSWORD= ./$(BINARY_NAME) migrate

# Health check
health:
	JWT_SECRET=development-jwt-secret-key-12345 REDIS_PASSWORD= ./$(BINARY_NAME) health

# Format code
fmt:
	$(GOCMD) fmt ./...

# Lint code (requires golangci-lint)
lint:
	golangci-lint run

# Security check (requires gosec)
security:
	gosec ./...

# Generate documentation
docs:
	godoc -http=:6060

# Docker build
docker-build:
	docker build -t whatsapp-chat-backend .

# Docker run
docker-run:
	docker-compose up

# Full setup for development
setup: deps build db-up
	@echo "Setup complete! Run 'make run' to start the server"

# Full test suite
test-all: test-unit test-integration test-coverage

# Production build
build-prod:
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 $(GOBUILD) -ldflags="-w -s" -o $(BINARY_NAME) ./cmd/server

.PHONY: build build-linux clean test test-coverage test-unit test-integration tidy deps run dev db-up db-down db-reset migrate health fmt lint security docs docker-build docker-run setup test-all build-prod