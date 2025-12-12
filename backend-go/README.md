# WhatsApp Chat Backend (Go)

A real-time chat application backend built with Go, following Clean Architecture principles and Domain-Driven Design (DDD).

## Features

- 🔐 **JWT Authentication** - Secure user authentication and authorization
- 💬 **Real-time Messaging** - WebSocket-based real-time communication
- 🏠 **Chat Rooms** - Create, join, and manage chat rooms
- 📱 **RESTful APIs** - Complete REST API for all operations
- 🗄️ **PostgreSQL Database** - Reliable data persistence
- ⚡ **Redis Caching** - Fast session and cache management
- 🏗️ **Clean Architecture** - Maintainable and testable code structure
- 🐳 **Docker Support** - Easy deployment with Docker Compose

## Tech Stack

- **Language**: Go 1.21+
- **Web Framework**: Gin
- **Database**: PostgreSQL with pgx driver
- **Cache**: Redis
- **WebSocket**: Gorilla WebSocket
- **Authentication**: JWT
- **Configuration**: Viper
- **Logging**: Structured logging
- **Testing**: Testify
- **Containerization**: Docker & Docker Compose

## Architecture

This project follows Clean Architecture principles with the following layers:

```
├── cmd/                    # Application entry points
├── internal/
│   ├── domain/            # Domain layer (entities, repositories)
│   ├── application/       # Application layer (use cases)
│   ├── infrastructure/    # Infrastructure layer (database, http, websocket)
│   └── shared/           # Shared utilities (config, logger, jwt)
├── tests/                # Tests (unit, integration)
├── migrations/           # Database migrations
└── deployments/         # Deployment configurations
```

## Quick Start

### Prerequisites

- Go 1.21 or higher
- Docker and Docker Compose
- Make (optional, for using Makefile commands)

### 1. Clone the repository

```bash
git clone <repository-url>
cd backend-go
```

### 2. Start dependencies

```bash
make db-up
# or
docker-compose up -d postgres redis
```

### 3. Build and run

```bash
make build
make run
# or
go build -o server cmd/server/main.go
JWT_SECRET=development-jwt-secret-key-12345 REDIS_PASSWORD= ./server
```

### 4. Test the API

```bash
# Health check
curl http://localhost:8080/health

# Register a user
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'

# Login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/logout` - Logout user
- `POST /api/v1/auth/refresh` - Refresh JWT token

### Chat Rooms
- `GET /api/v1/chatrooms` - Get user's chat rooms
- `POST /api/v1/chatrooms` - Create a new chat room
- `GET /api/v1/chatrooms/:id` - Get chat room details
- `POST /api/v1/chatrooms/:id/join` - Join a chat room
- `POST /api/v1/chatrooms/:id/leave` - Leave a chat room

### Messages
- `GET /api/v1/chatrooms/:room_id/messages` - Get messages from a chat room
- `POST /api/v1/chatrooms/:room_id/messages` - Send a message
- `GET /api/v1/messages/:id` - Get a specific message
- `PUT /api/v1/messages/:id/status` - Update message status
- `DELETE /api/v1/messages/:id` - Delete a message

### WebSocket
- `GET /ws?token=<jwt_token>` - WebSocket connection for real-time messaging

## WebSocket Events

### Client to Server
```json
{
  "type": "join_room",
  "room_id": "room-uuid"
}

{
  "type": "message",
  "room_id": "room-uuid",
  "content": "Hello, World!"
}

{
  "type": "typing",
  "room_id": "room-uuid"
}
```

### Server to Client
```json
{
  "type": "connected",
  "timestamp": "2023-12-12T10:00:00Z"
}

{
  "type": "new_message",
  "message_id": "msg-uuid",
  "room_id": "room-uuid",
  "sender_id": "user-uuid",
  "content": "Hello, World!",
  "created_at": "2023-12-12T10:00:00Z"
}
```

## Configuration

Environment variables:

```bash
# Server
PORT=8080
GIN_MODE=debug

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=whatsapp_chat_go
DB_SSL_MODE=disable

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRE_HOURS=24

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

## Development

### Available Make Commands

```bash
make build          # Build the application
make run            # Run the application
make test           # Run all tests
make test-unit      # Run unit tests only
make test-coverage  # Run tests with coverage
make db-up          # Start database services
make db-down        # Stop database services
make db-reset       # Reset database
make health         # Health check
make fmt            # Format code
make lint           # Lint code
make setup          # Full development setup
```

### Running Tests

```bash
# All tests
make test

# Unit tests only
make test-unit

# Integration tests only
make test-integration

# With coverage
make test-coverage
```

### Database Migrations

Migrations are automatically run when the server starts. Migration files are located in the `migrations/` directory.

## Deployment

### Docker

```bash
# Build and run with Docker Compose
docker-compose up --build

# Or build manually
docker build -t whatsapp-chat-backend .
docker run -p 8080:8080 whatsapp-chat-backend
```

### Production Build

```bash
make build-prod
```

## Project Structure

```
backend-go/
├── cmd/server/                 # Application entry point
├── internal/
│   ├── application/           # Use cases
│   │   ├── auth/             # Authentication use cases
│   │   ├── chat/             # Chat use cases
│   │   └── message/          # Message use cases
│   ├── domain/               # Domain entities
│   │   ├── user/             # User domain
│   │   ├── chat/             # Chat domain
│   │   └── message/          # Message domain
│   ├── infrastructure/       # Infrastructure layer
│   │   ├── database/         # Database implementations
│   │   ├── http/             # HTTP handlers and middleware
│   │   └── websocket/        # WebSocket implementation
│   └── shared/               # Shared utilities
│       ├── config/           # Configuration
│       ├── logger/           # Logging
│       ├── jwt/              # JWT utilities
│       └── validation/       # Validation
├── tests/                    # Tests
│   ├── unit/                # Unit tests
│   └── integration/         # Integration tests
├── migrations/              # Database migrations
├── deployments/            # Deployment configurations
├── .env.example           # Environment variables example
├── docker-compose.yml     # Docker Compose configuration
├── Dockerfile            # Docker configuration
├── Makefile             # Build and development commands
└── README.md           # This file
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you have any questions or need help, please open an issue on GitHub.