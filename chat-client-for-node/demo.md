# Go Chat Client Demo

## Prerequisites
1. Make sure the Go backend is running: `cd backend-go && make run`
2. The backend should be accessible at `http://localhost:8080`

## Demo Steps

### 1. Start the Client
```bash
cd chat-client
go run main.go
```

### 2. Login with Test User
- Choose option `1` (Login)
- Email: `test@example.com`
- Password: `password123`

### 3. Explore Chat Features

#### List Available Chat Rooms
- Choose option `4` (List Chat Rooms)
- You'll see available rooms with their IDs

#### Join a Chat Room
- Choose option `5` (Join Chat Room)
- Enter a room ID from the list above

#### Connect to WebSocket for Real-time Chat
- Choose option `1` (Connect to WebSocket)
- Use `/join <room_id>` to join a room
- Use `/send <message>` to send messages
- Use `/typing` to send typing indicators
- Use `/disconnect` to exit WebSocket mode

#### Send HTTP Messages (REST API)
- Choose option `2` (Send HTTP Message)
- Enter room ID and message content

#### View Chat History
- Choose option `3` (View Chat History)
- Enter room ID to see message history

#### Create New Group
- Choose option `6` (Create Group)
- Enter group name and participant user IDs

## WebSocket Commands
When in WebSocket mode, you can use these commands:
- `/send <message>` - Send message to current room
- `/join <room_id>` - Join a chat room
- `/typing` - Send typing indicator
- `/status <message>` - Update status
- `/disconnect` - Disconnect from WebSocket
- `/help` - Show help

## Features Demonstrated
✅ JWT Authentication (login/register)
✅ HTTP REST API integration
✅ WebSocket real-time messaging
✅ Chat room management
✅ Message history
✅ Typing indicators
✅ Room joining/leaving
✅ Group creation

## Architecture
- **Frontend**: Go CLI client with Gorilla WebSocket
- **Backend**: Go server with Gin, PostgreSQL, Redis
- **Real-time**: WebSocket connections with JWT authentication
- **Database**: PostgreSQL for persistence, Redis for caching