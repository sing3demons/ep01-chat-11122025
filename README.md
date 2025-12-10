# WhatsApp Chat System

A real-time chat application built with React frontend and Node.js backend, featuring WebSocket communication, group chats, and user presence management.

## Project Structure

```
├── frontend/          # React TypeScript frontend
│   ├── src/
│   │   ├── types/     # TypeScript interfaces
│   │   └── interfaces/ # Component interfaces
│   ├── package.json
│   ├── tsconfig.json
│   └── jest.config.js
├── backend/           # Node.js TypeScript backend
│   ├── src/
│   │   ├── types/     # TypeScript interfaces
│   │   └── interfaces/ # Service interfaces
│   ├── prisma/        # Database schema
│   ├── package.json
│   ├── tsconfig.json
│   └── jest.config.js
└── README.md
```

## Technology Stack

### Frontend
- React 18 with TypeScript
- Native WebSocket API for real-time communication
- Jest + fast-check for testing

### Backend
- Node.js with Express and TypeScript
- WebSocket server using 'ws' library
- PostgreSQL with Prisma ORM
- JWT authentication
- Jest + fast-check for testing

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

1. Install backend dependencies:
```bash
cd backend
npm install
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
```

3. Set up environment variables:
```bash
cd backend
cp .env.example .env
# Edit .env with your database credentials
```

4. Set up database:
```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

### Running the Application

1. Start the backend server:
```bash
cd backend
npm run dev
```

2. Start the frontend development server:
```bash
cd frontend
npm start
```

### Testing

Run tests for both frontend and backend:

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## Features

- Real-time messaging with WebSocket
- Group chat management
- User presence and online status
- Message status tracking (sent/delivered/read)
- Typing indicators
- Push notifications
- Contact management
- Message search and history
- Offline message queuing
- Cross-device synchronization
- End-to-end message encryption
- User authentication and authorization

## API Documentation

The backend provides RESTful APIs for:
- User authentication and management
- Chat room operations
- Message handling
- Notification management

WebSocket events handle real-time features like:
- Live message delivery
- Typing indicators
- User presence updates
- Real-time notifications