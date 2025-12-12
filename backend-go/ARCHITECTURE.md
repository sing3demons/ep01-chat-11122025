# Go Backend Architecture Design

## Overview
การออกแบบ backend ด้วย Go สำหรับระบบ chat แบบ real-time โดยใช้ Clean Architecture และ Domain-Driven Design (DDD)

## Architecture Patterns

### 1. Clean Architecture (Hexagonal Architecture)
```
┌─────────────────────────────────────────────────────────────┐
│                    Frameworks & Drivers                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   HTTP      │  │  WebSocket  │  │    PostgreSQL       │ │
│  │  (Gin/Fiber)│  │ (Gorilla WS)│  │     (GORM)          │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                Interface Adapters                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Controllers │  │  Presenters │  │   Repositories      │ │
│  │             │  │             │  │                     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                   Application Layer                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Use Cases  │  │  Services   │  │    Interfaces       │ │
│  │             │  │             │  │                     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    Domain Layer                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Entities   │  │ Value Objs  │  │  Domain Services    │ │
│  │             │  │             │  │                     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 2. Directory Structure
```
backend-go/
├── cmd/
│   └── server/
│       └── main.go                 # Application entry point
├── internal/
│   ├── domain/                     # Domain layer (entities, value objects)
│   │   ├── user/
│   │   │   ├── entity.go
│   │   │   ├── repository.go       # Interface
│   │   │   └── service.go          # Domain service
│   │   ├── chat/
│   │   ├── message/
│   │   └── notification/
│   ├── application/                # Application layer (use cases)
│   │   ├── auth/
│   │   │   ├── login_usecase.go
│   │   │   ├── register_usecase.go
│   │   │   └── interfaces.go
│   │   ├── chat/
│   │   ├── message/
│   │   └── notification/
│   ├── infrastructure/             # Infrastructure layer
│   │   ├── database/
│   │   │   ├── postgres/
│   │   │   │   ├── connection.go
│   │   │   │   ├── migrations/
│   │   │   │   └── repositories/
│   │   │   │       ├── user_repository.go
│   │   │   │       ├── chat_repository.go
│   │   │   │       └── message_repository.go
│   │   │   └── redis/
│   │   │       └── client.go
│   │   ├── websocket/
│   │   │   ├── hub.go
│   │   │   ├── client.go
│   │   │   └── manager.go
│   │   └── http/
│   │       ├── server.go
│   │       ├── middleware/
│   │       │   ├── auth.go
│   │       │   ├── cors.go
│   │       │   └── logging.go
│   │       └── handlers/
│   │           ├── auth_handler.go
│   │           ├── chat_handler.go
│   │           └── message_handler.go
│   └── shared/                     # Shared utilities
│       ├── config/
│       ├── logger/
│       ├── jwt/
│       ├── validation/
│       └── errors/
├── pkg/                           # Public packages
│   ├── crypto/
│   └── utils/
├── api/                           # API definitions
│   ├── openapi/
│   └── proto/                     # gRPC definitions (future)
├── deployments/                   # Deployment configurations
│   ├── docker/
│   └── k8s/
├── scripts/                       # Build and deployment scripts
├── tests/                         # Integration and e2e tests
│   ├── integration/
│   └── e2e/
├── docs/                          # Documentation
├── go.mod
├── go.sum
├── Makefile
└── README.md
```

## Core Components

### 1. Domain Layer
**Entities:**
- User: ข้อมูลผู้ใช้และ business rules
- ChatRoom: ห้องแชทและกฎการเข้าร่วม
- Message: ข้อความและสถานะ
- Notification: การแจ้งเตือน

**Value Objects:**
- UserID, ChatRoomID, MessageID
- Email, Username
- MessageStatus, UserStatus

**Domain Services:**
- AuthenticationService
- ChatRoomService
- NotificationService

### 2. Application Layer
**Use Cases:**
- RegisterUser
- LoginUser
- CreateChatRoom
- SendMessage
- JoinChatRoom
- GetChatHistory

### 3. Infrastructure Layer
**Database:**
- Raw SQL queries กับ database/sql + pgx driver
- Redis สำหรับ caching และ session
- SQL migrations กับ golang-migrate

**WebSocket:**
- Gorilla WebSocket
- Connection pooling
- Message broadcasting

**HTTP:**
- Gin หรือ Fiber framework
- JWT middleware
- Rate limiting

## Technology Stack

### Core Technologies
- **Language:** Go 1.21+
- **Web Framework:** Gin หรือ Fiber
- **Database:** PostgreSQL + pgx driver (raw SQL)
- **Cache:** Redis
- **WebSocket:** Gorilla WebSocket
- **Authentication:** JWT

### Additional Libraries
- **Configuration:** Viper
- **Logging:** Logrus หรือ Zap
- **Validation:** go-playground/validator
- **Testing:** Testify + Ginkgo
- **Migration:** golang-migrate
- **Monitoring:** Prometheus + Grafana

## Key Features

### 1. Real-time Communication
- WebSocket connection management
- Message broadcasting
- Typing indicators
- Online/offline status

### 2. Authentication & Authorization
- JWT-based authentication
- Role-based access control
- Session management
- Password hashing (bcrypt)

### 3. Chat Features
- Direct messaging
- Group chats
- Message status (sent, delivered, read)
- File sharing (future)

### 4. Performance Optimizations
- Connection pooling
- Message queuing
- Caching strategies
- Database indexing

### 5. Scalability
- Horizontal scaling support
- Load balancing
- Microservices ready
- Event-driven architecture

## Development Phases

### Phase 1: Core Infrastructure
1. Project setup และ dependency management
2. Database connection และ migrations
3. Basic HTTP server setup
4. Authentication system

### Phase 2: Core Features
1. User management
2. Chat room creation
3. Message sending/receiving
4. WebSocket implementation

### Phase 3: Advanced Features
1. Real-time notifications
2. Message status tracking
3. File upload/sharing
4. Search functionality

### Phase 4: Performance & Scaling
1. Caching implementation
2. Performance optimization
3. Monitoring และ logging
4. Load testing

## Benefits of Go Implementation

### Performance
- Compiled language = faster execution
- Goroutines = efficient concurrency
- Low memory footprint
- Fast startup time

### Scalability
- Built-in concurrency support
- Efficient WebSocket handling
- Easy horizontal scaling
- Microservices friendly

### Development
- Strong typing system
- Excellent tooling
- Fast compilation
- Simple deployment

### Maintenance
- Clear dependency management
- Excellent testing support
- Good documentation tools
- Strong community support