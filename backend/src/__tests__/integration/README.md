# Integration Tests

This directory contains comprehensive integration tests for the WhatsApp chat system.

## Test Files

### 1. `simple-integration.test.ts`
Basic integration tests that verify:
- API health endpoints
- Route structure and accessibility
- Authentication flow structure
- Error handling
- Content type handling
- HTTP method support
- Response format consistency

**Status**: ✅ Passing (19 tests)

### 2. `chat-system.integration.test.ts`
Comprehensive chat system integration tests covering:
- End-to-end user flows (registration → login → messaging)
- WebSocket connection and authentication
- Real-time message broadcasting
- Typing indicators
- Notification delivery
- Offline/online scenarios
- Error handling and edge cases

**Status**: ⚠️ Requires database setup

### 3. `end-to-end.integration.test.ts`
Complete end-to-end integration tests including:
- Full user journey from registration to chat
- Multi-user group chat scenarios
- Real-time messaging flows
- Notification system integration
- Offline message queuing and delivery
- Cross-device synchronization
- Performance and load testing
- Error recovery scenarios

**Status**: ⚠️ Requires database setup

### 4. `test-runner.ts`
Utility classes and functions for integration testing:
- `IntegrationTestRunner`: Server management for tests
- `TestUtils`: Helper functions for creating test data
- Global setup and teardown functions

## Frontend Integration Tests

### 1. `frontend/src/__tests__/integration/websocket-integration.test.tsx`
Frontend WebSocket integration tests covering:
- WebSocket connection management
- Real-time messaging
- Typing indicators
- Offline support and message queuing
- Error handling
- Cross-component integration

**Status**: ✅ Ready to run

### 2. `frontend/src/__tests__/integration/notification-integration.test.tsx`
Notification system integration tests covering:
- Notification display and management
- Browser notification integration
- Sound notification handling
- WebSocket notification delivery
- Priority and mention notifications
- Notification persistence
- Error handling

**Status**: ✅ Ready to run

## Running Tests

### Backend Tests

```bash
# Run all integration tests
npm run test:integration

# Run specific test file
npm test -- --testPathPattern="simple-integration"

# Run with verbose output
npm test -- --testPathPattern="integration" --verbose
```

### Frontend Tests

```bash
# Run all tests
npm test

# Run integration tests specifically
npm test -- --testPathPattern="integration"
```

## Test Coverage

The integration tests cover the following key areas:

### ✅ Completed
- **API Structure**: All endpoints are accessible and return proper responses
- **Authentication Flow**: Registration, login, and protected routes work correctly
- **Error Handling**: Malformed requests and edge cases are handled gracefully
- **Content Negotiation**: JSON and form data are processed correctly
- **WebSocket Mocking**: Frontend WebSocket integration is fully tested
- **Notification System**: Complete notification flow testing
- **Offline Support**: Message queuing and offline scenarios

### ⚠️ Requires Database
- **Real WebSocket Communication**: Actual WebSocket server testing
- **Database Operations**: User creation, message storage, etc.
- **Cross-Service Integration**: Full system integration with all services

### 🔄 Future Enhancements
- **Performance Testing**: Load testing with multiple concurrent users
- **Security Testing**: Authentication bypass attempts, injection attacks
- **Browser Compatibility**: Cross-browser WebSocket testing
- **Mobile Integration**: React Native or mobile web testing

## Test Architecture

### Mocking Strategy
- **Database**: Prisma client is mocked to avoid database dependency
- **WebSocket Services**: WebSocket manager and services are mocked
- **External Services**: All external dependencies are mocked

### Test Data Management
- **User Generation**: Utility functions create realistic test users
- **Message Generation**: Helper functions create test messages and chat rooms
- **State Management**: Tests maintain isolated state between runs

### Error Scenarios
- **Network Failures**: Connection drops, timeouts, and retries
- **Invalid Data**: Malformed JSON, missing fields, invalid tokens
- **Race Conditions**: Concurrent operations and state conflicts
- **Resource Limits**: Large payloads, rate limiting, memory constraints

## Best Practices

1. **Isolation**: Each test is independent and doesn't affect others
2. **Cleanup**: Proper cleanup of resources after each test
3. **Realistic Data**: Test data resembles real-world usage patterns
4. **Error Coverage**: Both success and failure scenarios are tested
5. **Performance**: Tests complete within reasonable time limits
6. **Maintainability**: Tests are readable and easy to update

## Troubleshooting

### Common Issues

1. **Port Conflicts**: Tests use dynamic ports to avoid conflicts
2. **Database Connections**: Mocked to avoid external dependencies
3. **Async Operations**: Proper waiting for async operations to complete
4. **Memory Leaks**: Cleanup of WebSocket connections and timers

### Debug Tips

1. Use `--verbose` flag for detailed test output
2. Check console logs for service-level errors
3. Verify mock implementations match real service interfaces
4. Use `--runInBand` for sequential test execution

## Contributing

When adding new integration tests:

1. Follow the existing test structure and naming conventions
2. Include both success and failure scenarios
3. Add proper cleanup in `afterEach` or `afterAll` hooks
4. Update this README with new test descriptions
5. Ensure tests are deterministic and don't rely on external state