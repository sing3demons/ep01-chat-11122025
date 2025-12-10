# WhatsApp Chat System - Backend

A real-time chat system backend built with Node.js, TypeScript, Express, and WebSocket.

## Features

- 🔐 JWT-based authentication
- 💬 Real-time messaging with WebSocket
- 👥 Group chat functionality
- 🔔 Real-time notifications
- 📱 Online/offline status tracking
- 🛡️ Secure password hashing
- 🗄️ PostgreSQL database with Prisma ORM
- ✅ Comprehensive testing with Jest
- 🏗️ Clean architecture (Controller-Service-Repository pattern)

## Project Structure

```
backend/
├── src/
│   ├── auth/                 # Authentication module
│   │   ├── controller/       # HTTP request handlers
│   │   ├── service/          # Business logic
│   │   ├── repository/       # Data access layer
│   │   └── routes/           # Route definitions
│   ├── config/               # Configuration files
│   ├── middleware/           # Express middleware
│   ├── routes/               # Main route definitions
│   ├── types/                # TypeScript type definitions
│   ├── utils/                # Utility functions
│   └── server.ts             # Main server file
├── prisma/                   # Database schema and migrations
├── __tests__/                # Test files
└── dist/                     # Compiled JavaScript files
```

## Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- PostgreSQL database
- Redis (optional, for future features)

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your configuration:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/whatsapp_chat_db"
   JWT_SECRET="your-super-secret-jwt-key"
   PORT=3001
   ```

5. Generate Prisma client:
   ```bash
   npm run prisma:generate
   ```

6. Push database schema:
   ```bash
   npm run prisma:push
   ```

## Development

Start the development server:
```bash
npm run dev
```

The server will start on `http://localhost:3001` with hot reloading enabled.

## Available Scripts

- `npm run dev` - Start development server with hot reloading
- `npm run build` - Build the project for production
- `npm start` - Start the production server
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:push` - Push schema changes to database
- `npm run prisma:studio` - Open Prisma Studio
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user (requires auth)
- `GET /api/auth/me` - Get current user info (requires auth)
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/change-password` - Change password (requires auth)

### Health Check
- `GET /api/health` - Server health check

## Testing

Run the test suite:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

The project includes:
- Unit tests for services and utilities
- Integration tests for API endpoints
- Property-based testing with fast-check

## Database

The project uses PostgreSQL with Prisma ORM. The database schema includes:

- Users table with authentication data
- Chat rooms for direct and group conversations
- Messages with status tracking
- Notifications system
- User settings (privacy and notifications)

## WebSocket Events

The WebSocket server handles real-time communication:

- `connection` - New client connection
- `message` - Send/receive messages
- `typing_start/stop` - Typing indicators
- `user_online/offline` - Status updates
- `join_room/leave_room` - Room management
- `notification` - Real-time notifications

## Environment Variables

See `.env.example` for all available configuration options.

## Production Deployment

1. Build the project:
   ```bash
   npm run build
   ```

2. Set production environment variables
3. Start the server:
   ```bash
   npm start
   ```

## Contributing

1. Follow the existing code structure
2. Write tests for new features
3. Use TypeScript strictly
4. Follow the Controller-Service-Repository pattern
5. Update documentation as needed

## License

MIT License