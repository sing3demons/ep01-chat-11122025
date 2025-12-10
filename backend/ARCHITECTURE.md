# Architecture Documentation

## Project Structure

This project follows a **feature-based modular architecture** with **Controller-Service-Repository** pattern.

### Directory Structure

```
backend/src/
├── auth/                     # Authentication module
│   ├── controller/           # HTTP request handlers
│   │   └── auth.controller.ts
│   ├── service/              # Business logic
│   │   └── auth.service.ts
│   ├── repository/           # Data access layer
│   │   └── auth.repository.ts
│   ├── routes/               # Route definitions
│   │   └── auth.routes.ts
│   ├── __tests__/            # Module tests
│   └── index.ts              # Module exports
├── config/                   # Configuration files
│   ├── constants.ts          # Application constants
│   └── database.ts           # Database configuration
├── middleware/               # Express middleware
│   └── auth.ts               # Authentication middleware
├── routes/                   # Main route definitions
│   └── index.ts              # Route aggregation
├── types/                    # TypeScript definitions
│   └── index.ts              # Type exports
├── utils/                    # Utility functions
│   ├── jwt.ts                # JWT utilities
│   ├── password.ts           # Password utilities
│   ├── validation.ts         # Input validation
│   └── encryption.ts         # Encryption utilities
└── server.ts                 # Main server file
```

## Architecture Patterns

### 1. Feature-Based Modules
Each feature (auth, chat, user, etc.) is organized as a self-contained module with its own:
- Controller (HTTP layer)
- Service (Business logic)
- Repository (Data access)
- Routes (Endpoint definitions)
- Tests (Unit and integration tests)

### 2. Controller-Service-Repository Pattern

**Controller Layer:**
- Handles HTTP requests and responses
- Input validation and sanitization
- Error handling and status codes
- Calls service layer for business logic

**Service Layer:**
- Contains business logic and rules
- Orchestrates repository calls
- Handles complex operations
- Returns structured responses

**Repository Layer:**
- Direct database interactions
- CRUD operations
- Query optimization
- Data transformation

## Benefits

1. **Modularity**: Each feature is self-contained
2. **Testability**: Clear separation of concerns
3. **Maintainability**: Easy to locate and modify code
4. **Scalability**: Easy to add new features
5. **Reusability**: Services and repositories can be reused