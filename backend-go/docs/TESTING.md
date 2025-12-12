# Testing Guide

This document describes the testing strategy and how to run tests for the WhatsApp Chat Backend Go application.

## Testing Strategy

Our testing approach follows the testing pyramid with three levels:

### 1. Unit Tests
- **Purpose**: Test individual functions and methods in isolation
- **Location**: Alongside source code in `*_test.go` files
- **Coverage**: Business logic, utilities, domain entities
- **Speed**: Very fast (< 1s)
- **Dependencies**: None (mocked)

### 2. Integration Tests
- **Purpose**: Test interactions between components with real dependencies
- **Location**: `tests/integration/`
- **Coverage**: Repository operations, database interactions, cache operations
- **Speed**: Medium (5-30s)
- **Dependencies**: Real PostgreSQL and Redis (via testcontainers)

### 3. End-to-End (E2E) Tests
- **Purpose**: Test complete user workflows through HTTP API
- **Location**: `tests/e2e/`
- **Coverage**: Full API endpoints, WebSocket communication, user flows
- **Speed**: Slow (30s-2m)
- **Dependencies**: Full application stack

## Running Tests

### Prerequisites

1. **Go 1.21+** installed
2. **Docker** running (for integration and E2E tests)
3. **Make** utility

### Quick Start

```bash
# Run all tests
make test-all

# Run specific test types
make test-unit        # Unit tests only
make test-integration # Integration tests only
make test-e2e        # E2E tests only

# Generate coverage report
make test-coverage
```

### Individual Test Commands

```bash
# Unit tests (fast, no external dependencies)
go test -v -short ./...

# Integration tests (with testcontainers)
cd tests/integration && go test -v ./...

# E2E tests (full application)
cd tests/e2e && go test -v ./...

# Run with coverage
go test -v -coverprofile=coverage.out ./...
go tool cover -html=coverage.out -o coverage.html
```

### Docker-based Testing

```bash
# Run all tests in Docker containers
make test-docker

# Or manually with docker-compose
docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit
```

## Test Structure

### Unit Tests

Located alongside source code:

```
internal/
├── domain/
│   ├── user/
│   │   ├── entity.go
│   │   └── entity_test.go      # Unit tests
│   └── chat/
│       ├── entity.go
│       └── entity_test.go
├── shared/
│   ├── jwt/
│   │   ├── service.go
│   │   └── service_test.go
```

Example unit test:
```go
func TestUser_CheckPassword(t *testing.T) {
    user, err := user.NewUser("test", "test@example.com", "password123")
    require.NoError(t, err)
    
    // Valid password
    err = user.CheckPassword("password123")
    assert.NoError(t, err)
    
    // Invalid password
    err = user.CheckPassword("wrongpassword")
    assert.Error(t, err)
}
```

### Integration Tests

Located in `tests/integration/`:

```
tests/integration/
├── setup_test.go           # Test setup and teardown
├── auth_test.go           # Authentication integration tests
├── repository_test.go     # Repository integration tests
└── go.mod                 # Separate module for integration tests
```

Features:
- **Testcontainers**: Automatic PostgreSQL and Redis containers
- **Real databases**: Tests against actual database instances
- **Isolated**: Each test gets clean database state
- **Parallel**: Tests can run in parallel

Example integration test:
```go
func TestUserRepository_Create(t *testing.T) {
    require.NoError(t, cleanupTables())
    
    userRepo := repositories.NewUserRepository(testDB)
    ctx := context.Background()
    
    newUser, err := user.NewUser("testuser", "test@example.com", "password123")
    require.NoError(t, err)
    
    err = userRepo.Create(ctx, newUser)
    require.NoError(t, err)
    
    retrievedUser, err := userRepo.GetByID(ctx, newUser.ID)
    require.NoError(t, err)
    assert.Equal(t, newUser.Username, retrievedUser.Username)
}
```

### E2E Tests

Located in `tests/e2e/`:

```
tests/e2e/
├── setup_test.go          # Full application setup
├── auth_flow_test.go      # Authentication flow tests
├── chat_flow_test.go      # Chat functionality tests
├── websocket_test.go      # WebSocket communication tests
└── go.mod                 # Separate module for E2E tests
```

Features:
- **Full application**: Complete HTTP server with all dependencies
- **Real HTTP requests**: Tests actual API endpoints
- **WebSocket testing**: Real-time communication testing
- **User workflows**: Complete user journey testing

Example E2E test:
```go
func TestAuthFlowE2E(t *testing.T) {
    // Register user
    registerPayload := map[string]string{
        "username": "e2euser",
        "email":    "e2e@example.com",
        "password": "Password123",
    }
    
    registerBody, _ := json.Marshal(registerPayload)
    resp, err := testClient.Post(baseURL+"/api/v1/auth/register", 
        "application/json", bytes.NewBuffer(registerBody))
    require.NoError(t, err)
    defer resp.Body.Close()
    
    assert.Equal(t, http.StatusCreated, resp.StatusCode)
    
    var registerResponse AuthResponse
    err = json.NewDecoder(resp.Body).Decode(&registerResponse)
    require.NoError(t, err)
    
    assert.NotEmpty(t, registerResponse.AccessToken)
}
```

## Test Configuration

### Environment Variables

Tests use these environment variables:

```bash
# Integration tests
TEST_DB_HOST=localhost
TEST_DB_PORT=5432
TEST_DB_USER=testuser
TEST_DB_PASSWORD=testpass
TEST_DB_NAME=testdb
TEST_REDIS_HOST=localhost
TEST_REDIS_PORT=6379

# E2E tests
E2E_BASE_URL=http://localhost:8081
E2E_TIMEOUT=30s
```

### Test Data Management

- **Clean state**: Each test starts with clean database
- **Isolation**: Tests don't interfere with each other
- **Fixtures**: Reusable test data creation helpers
- **Cleanup**: Automatic cleanup after tests

## WebSocket Testing

WebSocket tests verify real-time communication:

```go
func TestWebSocketCommunication(t *testing.T) {
    // Connect to WebSocket
    wsURL := url.URL{Scheme: "ws", Host: "localhost:8081", 
        Path: "/ws", RawQuery: "token=" + userToken}
    conn, _, err := websocket.DefaultDialer.Dial(wsURL.String(), nil)
    require.NoError(t, err)
    defer conn.Close()
    
    // Send message
    msg := WSMessage{
        Type: "send_message",
        Payload: map[string]interface{}{
            "room_id": roomID,
            "content": "Hello WebSocket!",
        },
    }
    
    err = conn.WriteJSON(msg)
    require.NoError(t, err)
    
    // Verify response
    var response map[string]interface{}
    err = conn.ReadJSON(&response)
    require.NoError(t, err)
    assert.Equal(t, "message_sent", response["type"])
}
```

## Performance Testing

### Benchmarks

Run performance benchmarks:

```bash
make benchmark

# Or directly
go test -bench=. -benchmem ./...
```

Example benchmark:
```go
func BenchmarkUserRepository_Create(b *testing.B) {
    userRepo := repositories.NewUserRepository(testDB)
    ctx := context.Background()
    
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        user, _ := user.NewUser(fmt.Sprintf("user%d", i), 
            fmt.Sprintf("user%d@example.com", i), "password123")
        userRepo.Create(ctx, user)
    }
}
```

### Load Testing

For load testing, use external tools like:
- **Artillery**: HTTP load testing
- **WebSocket King**: WebSocket load testing
- **k6**: Modern load testing

## Coverage Reports

Generate and view coverage:

```bash
make test-coverage
open coverage.html  # View in browser
```

Coverage targets:
- **Unit tests**: > 80%
- **Integration tests**: > 70%
- **Overall**: > 75%

## Continuous Integration

### GitHub Actions

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v3
        with:
          go-version: '1.21'
      
      - name: Run tests
        run: make test-all
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage.out
```

### Pre-commit Hooks

```bash
# Install pre-commit hooks
go install github.com/pre-commit/pre-commit@latest

# Run tests before commit
pre-commit install
```

## Troubleshooting

### Common Issues

1. **Docker not running**
   ```bash
   # Start Docker
   sudo systemctl start docker
   ```

2. **Port conflicts**
   ```bash
   # Check port usage
   lsof -i :5432
   lsof -i :6379
   ```

3. **Test containers not cleaning up**
   ```bash
   # Clean up containers
   docker system prune -f
   ```

4. **Go module issues**
   ```bash
   # Clean module cache
   go clean -modcache
   go mod download
   ```

### Debug Mode

Run tests with verbose output:

```bash
# Verbose output
go test -v ./...

# With race detection
go test -race ./...

# With CPU profiling
go test -cpuprofile=cpu.prof ./...
```

## Best Practices

### Writing Tests

1. **Arrange-Act-Assert**: Structure tests clearly
2. **Descriptive names**: Use clear test function names
3. **Single responsibility**: One assertion per test
4. **Independent tests**: Tests should not depend on each other
5. **Clean up**: Always clean up resources

### Test Data

1. **Minimal data**: Use minimal test data
2. **Realistic data**: Use realistic but simple data
3. **Avoid hardcoding**: Use factories for test data
4. **Clean state**: Start each test with clean state

### Performance

1. **Parallel tests**: Use `t.Parallel()` when possible
2. **Short flag**: Use `-short` flag for quick tests
3. **Benchmarks**: Write benchmarks for critical paths
4. **Profiling**: Profile slow tests

This comprehensive testing strategy ensures high code quality, reliability, and maintainability of the WhatsApp Chat Backend Go application.