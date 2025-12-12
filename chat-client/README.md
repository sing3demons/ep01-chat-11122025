# 🚀 WhatsApp Chat Client (Go)

A command-line chat client built in Go that connects to the Go backend WhatsApp-style chat system.

## ✨ **Key Features**

### 🎯 **Dual Communication Modes**
- **WebSocket Realtime** ⚡ - Live chat with instant messaging
- **HTTP REST API** 🌐 - Reliable messaging via REST endpoints

### 🔐 **Authentication & Security**
- JWT token-based authentication
- Secure WebSocket connections with token validation
- User registration and login

### 💬 **Real-time Features**
- Instant messaging between users
- Typing indicators
- Room management (join/leave/create)
- Group chat creation
- Message history retrieval

## 🛠️ **Installation & Setup**

### **Prerequisites**
- Go 1.21 or higher
- Go backend server running on `localhost:8080`
- PostgreSQL and Redis (via Docker)

### **Quick Setup**
```bash
# 1. Start the Go backend
cd backend-go
make run

# 2. Run integration tests
cd ../chat-client
chmod +x test-integration.sh
./test-integration.sh

# 3. Start chat client
go run main.go
```

## 🎮 **Usage Guide**

### **Main Menu**
```
📋 Choose an option:
1. Login           # Authenticate with existing account
2. Register        # Create new user account
3. Exit            # Close application
```

### **Chat Options Menu**
```
💬 Chat Options:
1. Connect to WebSocket (Realtime)    # ⚡ Live chat mode
2. Send HTTP Message (REST API)       # 🌐 REST messaging
3. View Chat History                  # 📜 Message history
4. List Chat Rooms                    # 🔍 Available rooms
5. Join Chat Room                     # 🏠 Room management
6. Create Group                       # 👥 Group creation
7. Logout                            # 👋 End session
```

## ⚡ **WebSocket Realtime Mode**

### **Commands**
```bash
/join <room_id>     # Join a chat room
/send <message>     # Send message to current room
/typing             # Send typing indicator
/status <message>   # Update your status
/disconnect         # Leave WebSocket mode
/help               # Show command help
```

### **Example Session**
```bash
go run main.go
# Login: test@example.com / password123
# Choose: 1 (WebSocket)

🔗 Connected to WebSocket server!
✅ Connected to WebSocket server!

/join c565d9e3-7e3a-4f3b-983e-0dfda67db8df
🏠 Joining chat room: c565d9e3-7e3a-4f3b-983e-0dfda67db8df
✅ Successfully joined room: c565d9e3-7e3a-4f3b-983e-0dfda67db8df

/send Hello everyone! 👋
📤 [14:30] You: Hello everyone! 👋

# Messages from other users appear instantly:
📥 [14:31] User-62c71fa7: Hi there! 😊
⌨️ User-62c71fa7 is typing...
📥 [14:32] User-62c71fa7: How are you? 🎉
```

## 🌐 **HTTP REST API Mode**

### **Features**
- Send messages via HTTP POST to `/api/v1/chatrooms/{room_id}/messages`
- View chat history via HTTP GET from `/api/v1/chatrooms/{room_id}/messages`
- Create and manage chat rooms
- Works with poor connectivity

### **Usage**
```bash
# Choose: 6 (Create Group)
👥 Group Name: My Team
👤 Participant User IDs: user-id-1,user-id-2
✅ Group 'My Team' created successfully!
🆔 Group ID: new-room-id

# Choose: 2 (Send HTTP Message)
🏠 Chat Room ID: new-room-id
💬 Message: Hello team via HTTP!
✅ Message sent successfully!
```

## 👥 **Multi-User Chat Testing**

### **Setup Multiple Users**
```bash
# Terminal 1 - User 1
go run main.go
1 → test@example.com → password123 → 1 (WebSocket)
/join demo_room
/send Hi everyone!

# Terminal 2 - User 2 (register new user first)
go run main.go
2 → user2@example.com → password123 → 1 (WebSocket)
/join demo_room
/send Hello User 1!
```

## 🔧 **Configuration**

### **Backend URLs**
```go
// Current configuration
HTTP API: http://localhost:8080/api/v1
WebSocket: ws://localhost:8080/ws
```

### **Test Credentials**
```
Email: test@example.com
Password: password123
```

## 🧪 **Testing**

### **Integration Tests**
```bash
cd chat-client
./test-integration.sh
```

This will test:
- ✅ Backend health check
- ✅ User registration
- ✅ User login
- ✅ Chat room creation
- ✅ Chat room listing

### **Manual Testing**
See [demo.md](demo.md) for a complete walkthrough.

## 🚨 **Troubleshooting**

### **Connection Issues**

#### **Problem: Backend not running**
```
❌ Failed to create request: connection refused
```

**Solution:**
```bash
cd backend-go
make run
# Should see: Starting HTTP server port 8080
```

#### **Problem: Authentication failed**
```
❌ Login failed: Status 401
```

**Solutions:**
1. Use test credentials: `test@example.com / password123`
2. Register new account using option 2
3. Run integration tests to create test user

### **WebSocket Issues**

#### **Problem: WebSocket connection failed**
```
❌ WebSocket connection failed: invalid token
```

**Solutions:**
1. Ensure you're logged in first
2. Check JWT token is valid
3. Verify backend WebSocket endpoint is running

## 📊 **API Integration**

### **Endpoints Used**
```
POST /api/v1/auth/register              # User registration
POST /api/v1/auth/login                 # User authentication
GET  /api/v1/chatrooms                  # List chat rooms
POST /api/v1/chatrooms                  # Create chat room
POST /api/v1/chatrooms/{id}/join        # Join chat room
GET  /api/v1/chatrooms/{id}/messages    # Get messages
POST /api/v1/chatrooms/{id}/messages    # Send message
WebSocket: ws://localhost:8080/ws       # Real-time communication
```

### **Message Format**
```json
{
  "type": "message",
  "room_id": "room-uuid",
  "sender_id": "user-uuid", 
  "content": "Hello world!",
  "timestamp": "2025-12-12T13:53:20Z"
}
```

## 🎯 **Architecture**

```
┌─────────────────┐    HTTP/WebSocket    ┌─────────────────┐
│   Go CLI Client │ ←──────────────────→ │   Go Backend    │
│                 │                      │                 │
│ • Authentication│                      │ • JWT Auth      │
│ • WebSocket     │                      │ • WebSocket Hub │
│ • REST API      │                      │ • REST API      │
│ • Chat UI       │                      │ • PostgreSQL    │
└─────────────────┘                      │ • Redis Cache   │
                                         └─────────────────┘
```

## 🔄 **Integration Status**

✅ **Completed Integration with Go Backend**
- JWT authentication with token-based WebSocket connections
- REST API endpoints for chat rooms and messages  
- Real-time WebSocket messaging with proper message formats
- Chat room management (create, join, list)
- Message history retrieval
- Typing indicators and status updates
- Cross-platform compatibility

## 📝 **Dependencies**

```go
module chat-client

go 1.21

require github.com/gorilla/websocket v1.5.1
```

## 🚀 **Quick Start (5 minutes)**

```bash
# 1. Start backend
cd backend-go && make run

# 2. Test integration  
cd ../chat-client && ./test-integration.sh

# 3. Start client
go run main.go

# 4. Login and chat
# Email: test@example.com, Password: password123
# Choose WebSocket mode and start chatting!
```

**Perfect for testing and demonstrating real-time chat systems!** 🚀💬✨