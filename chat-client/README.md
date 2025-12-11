# WhatsApp Chat Client (Golang)

A command-line chat client written in Go that connects to the WhatsApp-like chat system backend.

## Features

### 🔐 Authentication
- User login and registration
- JWT token-based authentication
- Secure session management

### 💬 Chat Options
1. **Realtime WebSocket Connection** - Live chat with instant messaging
2. **HTTP REST API** - Send messages via HTTP requests
3. **Chat History** - View previous messages
4. **Room Management** - Join chat rooms and create groups

### ⚡ Realtime Features (WebSocket Mode)
- **Live Messaging**: Send and receive messages instantly
- **Typing Indicators**: See when others are typing
- **User Status**: Real-time online/offline status updates
- **Notifications**: Receive instant notifications
- **Room Management**: Join/leave chat rooms dynamically

### 🌐 HTTP Features (REST API Mode)
- **Message Sending**: Send messages via HTTP POST
- **Chat History**: Retrieve message history via HTTP GET
- **Group Creation**: Create new group chats
- **User Management**: Manage contacts and groups

## Installation

1. **Install Go** (version 1.21 or higher)

2. **Clone and setup**:
   ```bash
   cd chat-client
   go mod tidy
   ```

3. **Build the client**:
   ```bash
   go build -o chat-client main.go
   ```

## Usage

### Start the Client
```bash
./chat-client
```

### Main Menu Options
```
📋 Choose an option:
1. Login
2. Register  
3. Exit
```

### Chat Menu Options (After Login)
```
💬 Chat Options:
1. Connect to WebSocket (Realtime)    # ⚡ Live chat mode
2. Send HTTP Message (REST API)       # 🌐 HTTP request mode
3. View Chat History                  # 📜 Message history
4. Join Chat Room                     # 🏠 Room management
5. Create Group                       # 👥 Group creation
6. Logout                            # 👋 Exit
```

## Realtime WebSocket Commands

When connected to WebSocket (Option 1), use these commands:

```bash
/send <message>     # Send message to current chat room
/join <room_id>     # Join a specific chat room
/typing             # Send typing indicator
/status <message>   # Update your status
/disconnect         # Disconnect from WebSocket
/help               # Show command help
```

### Example WebSocket Session
```bash
🔗 Connected to WebSocket server!

⚡ Realtime Chat Mode
/join room_123
🏠 Joined chat room: room_123

/send Hello everyone!
📤 [14:30] You: Hello everyone!

📥 [14:31] Alice: Hi there!
⌨️ Bob is typing...
📥 [14:32] Bob: Welcome to the chat!
```

## Configuration

### Backend URLs
The client connects to:
- **HTTP API**: `http://localhost:3001`
- **WebSocket**: `ws://localhost:3001`

### Authentication
- Uses JWT tokens for API authentication
- Tokens are automatically included in WebSocket and HTTP requests
- Session persists until logout

## Message Types

### WebSocket Messages
- `message` - Chat messages
- `typing_start` - Typing indicators  
- `user_status` - Online/offline status
- `notification` - System notifications
- `join_room` - Room join events

### HTTP Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/messages` - Send message
- `GET /api/messages?chatRoomId=<id>` - Get chat history
- `POST /api/groups` - Create group

## Example Usage Scenarios

### 1. Quick Message (HTTP Mode)
```bash
# Login → Option 2 (HTTP) → Send message
1. Login with credentials
2. Choose "Send HTTP Message"
3. Enter room ID and message
4. Message sent via REST API
```

### 2. Live Chat (WebSocket Mode)  
```bash
# Login → Option 1 (WebSocket) → Live chat
1. Login with credentials
2. Choose "Connect to WebSocket"
3. Use /join <room_id> to join room
4. Type messages or use /send command
5. Receive real-time messages from others
```

### 3. Group Management
```bash
# Create new group chat
1. Login with credentials
2. Choose "Create Group"
3. Enter group name and participant IDs
4. Group created and ready for messaging
```

## Error Handling

- **Connection Errors**: Automatic retry suggestions
- **Authentication Errors**: Clear error messages
- **Invalid Commands**: Help text and usage examples
- **Network Issues**: Graceful degradation to HTTP mode

## Development

### Dependencies
- `github.com/gorilla/websocket` - WebSocket client library
- Standard Go libraries for HTTP, JSON, and CLI

### Building
```bash
go build -o chat-client main.go
```

### Cross-platform Build
```bash
# Windows
GOOS=windows GOARCH=amd64 go build -o chat-client.exe main.go

# macOS
GOOS=darwin GOARCH=amd64 go build -o chat-client-mac main.go

# Linux
GOOS=linux GOARCH=amd64 go build -o chat-client-linux main.go
```

## Troubleshooting

### Connection Issues
1. Ensure backend server is running on `localhost:3001`
2. WebSocket server runs on the same port as HTTP server (`localhost:3001`)
3. Check firewall settings

### Authentication Issues
1. Verify credentials are correct
2. Check if user is registered
3. Ensure backend database is accessible

### WebSocket Issues
1. Try HTTP mode as fallback
2. Check network connectivity
3. Verify WebSocket server is running

## Features Comparison

| Feature | WebSocket Mode | HTTP Mode |
|---------|---------------|-----------|
| Real-time messaging | ✅ | ❌ |
| Typing indicators | ✅ | ❌ |
| Live status updates | ✅ | ❌ |
| Message history | ✅ | ✅ |
| Group creation | ✅ | ✅ |
| Offline capability | ❌ | ✅ |
| Battery usage | Higher | Lower |
| Network usage | Persistent | On-demand |

Choose **WebSocket mode** for live chat experiences and **HTTP mode** for simple messaging or when connectivity is limited.