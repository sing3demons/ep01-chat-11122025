#!/bin/bash

set -e

echo "🧪 Running all tests for WhatsApp Chat Backend Go"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if required tools are installed
if ! command -v go &> /dev/null; then
    print_error "Go is not installed. Please install Go 1.21+ and try again."
    exit 1
fi

print_status "Starting test suite..."

# Run unit tests
print_status "Running unit tests..."
if make test-unit; then
    print_status "✅ Unit tests passed"
else
    print_error "❌ Unit tests failed"
    exit 1
fi

# Run integration tests
print_status "Running integration tests..."
if make test-integration; then
    print_status "✅ Integration tests passed"
else
    print_error "❌ Integration tests failed"
    exit 1
fi

# Run E2E tests
print_status "Running E2E tests..."
if make test-e2e; then
    print_status "✅ E2E tests passed"
else
    print_error "❌ E2E tests failed"
    exit 1
fi

# Generate coverage report
print_status "Generating coverage report..."
if make test-coverage; then
    print_status "✅ Coverage report generated"
else
    print_warning "⚠️  Coverage report generation failed"
fi

print_status "🎉 All tests completed successfully!"
print_status "📊 Check coverage.html for detailed coverage report"