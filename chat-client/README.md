# 🚀 WhatsApp Chat Client (Golang) - Complete Guide

A command-line chat client written in Go that provides **Choose Options** for real-time communication with WebSocket and HTTP REST API modes.

## ✨ **Key Features**

### 🎯 **Dual Communication Modes**
- **Option 1: WebSocket Realtime** ⚡ - Live chat with instant messaging
- **Option 2: HTTP REST API** 🌐 - Reliable messaging for poor connectivity

### 🔐 **Authentication & Security**
- JWT token-based authentication
- Secure session management
- User registration and login

### 💬 **Real-time Features**
- Instant messaging between users
- Typing indicators
- User online/offline status
- Room management (join/leave)
- Group chat creation

## 🛠️ **Installation & Setup**

### **Prerequisites**
- Go 1.21 or higher
- Backend server running on `localhost:3001`
- PostgreSQL database (via Docker)

### **Quick Setup**
```bash
# 1. Clone and build
cd chat-client
go mod tidy
go build -o chat-client main.go

# 2. Start backend (separate terminal)
cd ../backend
docker-compose up -d  # Start database
npm run dev          # Start backend server

# 3. Run chat client
./chat-client
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
2. Send HTTP Message (REST API)       # 🌐 Simple messaging
3. View Chat History                  # 📜 Message history
4. Join Chat Room                     # 🏠 Room management
5. Create Group                       # 👥 Group creation
6. Logout                            # 👋 End session
```

## ⚡ **WebSocket Realtime Mode (Option 1)**

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
./chat-client
# Login: alice@test.com / password123
# Choose: 1 (WebSocket)

🔗 Connected to WebSocket server!
✅ Authentication successful!

/join friends_chat
🏠 Joined chat room: friends_chat
✅ Successfully joined room: friends_chat

/send Hello everyone! 👋
📤 [14:30] You: Hello everyone! 👋
📥 [14:30] Alice: Hello everyone! 👋

# Messages from other users appear instantly:
📥 [14:31] Bob: Hi Alice! 😊
⌨️ Charlie is typing...
📥 [14:32] Charlie: Hey friends! 🎉
```

## 🌐 **HTTP REST API Mode (Option 2)**

### **Features**
- Send messages via HTTP POST
- View chat history via HTTP GET
- Works with poor connectivity
- Lower battery usage

### **Usage Methods**

#### **Method 1: Create Group First**
```bash
# Choose: 5 (Create Group)
👥 Group Name: My Team
👤 Participant Emails: bob@test.com,charlie@test.com
✅ Group 'My Team' created successfully!
🆔 Group ID: 550e8400-e29b-41d4-a716-446655440000

# Choose: 2 (Send HTTP Message)
💬 Message: Hello team via HTTP!
✅ Message sent successfully!
```

#### **Method 2: Use 'auto' for Direct Chat**
```bash
# Choose: 2 (Send HTTP Message)
🏠 Chat Room ID (or 'auto' for direct chat): auto
💬 Message: Direct message via HTTP!
✅ Message sent successfully!
```

## 👥 **Multi-User Chat Testing**

### **Setup Multiple Users**
```bash
# Terminal 1 - Alice
./chat-client
1 → alice@test.com → password123 → 1 (WebSocket)
/join demo_room
/send Hi everyone!

# Terminal 2 - Bob
./chat-client
1 → bob@test.com → password123 → 1 (WebSocket)
/join demo_room
/send Hello Alice!

# Terminal 3 - Charlie
./chat-client
1 → charlie@test.com → password123 → 1 (WebSocket)
/join demo_room
/send Hey friends!
```

**Result:** All users see each other's messages in real-time! 🎉

## 🔧 **Configuration**

### **Backend URLs**
```go
// Default configuration
HTTP API: http://localhost:3001
WebSocket: ws://localhost:3001
```

### **Test Users**
```
Email: alice@test.com    Password: password123
Email: bob@test.com      Password: password123
Email: charlie@test.com  Password: password123
```

## 🛠️ **Build Commands**

### **Basic Build**
```bash
go build -o chat-client main.go
```

### **Cross-Platform Build**
```bash
# Windows
GOOS=windows GOARCH=amd64 go build -o chat-client.exe main.go

# macOS
GOOS=darwin GOARCH=amd64 go build -o chat-client-mac main.go

# Linux
GOOS=linux GOARCH=amd64 go build -o chat-client-linux main.go
```

### **Using Makefile**
```bash
make build      # Build for current platform
make build-all  # Build for all platforms
make run        # Build and run
make clean      # Clean build artifacts
```

## 🚨 **Troubleshooting**

### **Connection Issues**

#### **Problem: WebSocket connection refused**
```
❌ WebSocket connection failed: dial tcp [::1]:3001: connect: connection refused
```

**Solution:**
```bash
# Start backend server
cd backend
npm run dev

# Should see:
🚀 Server is running on port 3001
📡 WebSocket server is ready
```

#### **Problem: Authentication failed**
```
❌ Login failed: Invalid credentials
```

**Solutions:**
1. Use test credentials: `alice@test.com / password123`
2. Create test users: `cd backend && node create-test-user.js`
3. Register new account using option 2

### **HTTP API Issues**

#### **Problem: HTTP message fails with Status 400**
```
❌ Failed to send message. Status: 400
```

**Solutions:**
1. Create group first (Option 5) to get valid room ID
2. Use 'auto' for direct chat
3. Ensure you're logged in with valid token

### **Real-time Chat Issues**

#### **Problem: Can't see other users' messages**
```
Alice sends message but Bob doesn't see it
```

**Solutions:**
1. Ensure both users join the same room: `/join same_room_name`
2. Check both users are authenticated successfully
3. Verify backend server is running without errors

## 📊 **Feature Comparison**

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
| Reliability | Requires stable connection | Works with poor connectivity |

## 🎯 **Choose Your Mode**

### **Use WebSocket Mode When:**
- You want live chat experience
- Network connection is stable
- Real-time interaction is important
- Multiple users chatting simultaneously

### **Use HTTP Mode When:**
- Network connection is unstable
- Battery life is important
- Simple message sending is sufficient
- Offline capability is needed

## 🔄 **Integration with Backend**

### **API Endpoints Used**
```
POST /api/auth/login        # User authentication
POST /api/auth/register     # User registration
POST /api/messages          # Send message (HTTP mode)
GET /api/messages           # Get chat history
POST /api/chatrooms         # Create group chat
WebSocket: ws://localhost:3001  # Real-time communication
```

### **Message Flow**
```
1. Authentication: JWT token exchange
2. WebSocket: Persistent connection for real-time
3. Room Management: Join/leave chat rooms
4. Message Broadcasting: Real-time message delivery
5. HTTP Fallback: Reliable message sending
```

## 🎉 **Success Indicators**

### **Healthy System Shows:**
```bash
# Backend
🚀 Server is running on port 3001
📡 WebSocket server is ready

# Client Connection
🔗 Connected to WebSocket server!
✅ Authentication successful!
✅ Successfully joined room: room_name

# Message Flow
📤 [14:30] You: Hello!
📥 [14:31] Friend: Hi there!
⌨️ Friend is typing...
```

## 📝 **Dependencies**

### **Go Modules**
```go
module chat-client

go 1.21

require github.com/gorilla/websocket v1.5.1
```

### **Key Libraries**
- `github.com/gorilla/websocket` - WebSocket client
- Standard Go libraries for HTTP, JSON, CLI

## 🚀 **Quick Start Commands**

### **5-Minute Test**
```bash
# Terminal 1
./chat-client
1 → alice@test.com → password123 → 1
/join quick_test
/send Testing 123

# Terminal 2
./chat-client
1 → bob@test.com → password123 → 1
/join quick_test
# Should see: 📥 [time] Alice: Testing 123
/send I can see your message!

# Terminal 1 should see: 📥 [time] Bob: I can see your message!
```

## 🎯 **Production Ready**

This chat client is production-ready with:
- ✅ **Secure Authentication** - JWT-based security
- ✅ **Real-time Communication** - WebSocket integration
- ✅ **Reliable Fallback** - HTTP REST API mode
- ✅ **Error Handling** - Graceful error recovery
- ✅ **Cross-Platform** - Works on Windows, macOS, Linux
- ✅ **User-Friendly** - Intuitive command-line interface

**Perfect for testing, development, and production use of real-time chat systems!** 🚀💬✨