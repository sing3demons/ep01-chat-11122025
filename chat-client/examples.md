# Chat Client Usage Examples

## 🚀 Quick Start Guide

### 1. Start the Backend Server
```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start database (if not running)
docker-compose up -d
```

### 2. Run the Chat Client
```bash
# Terminal 3: Start chat client
cd chat-client
./chat-client
```

## 📋 Example Sessions

### Session 1: Registration and Login
```
🚀 WhatsApp Chat Client
========================

📋 Choose an option:
1. Login
2. Register
3. Exit
Enter your choice (1-3): 2

👤 Username: john_doe
📧 Email: john@example.com
🔒 Password: password123
✅ Registration successful! Please login.

📋 Choose an option:
1. Login
2. Register
3. Exit
Enter your choice (1-3): 1

📧 Email: john@example.com
🔒 Password: password123
✅ Login successful! Welcome, john_doe
```

### Session 2: Realtime WebSocket Chat
```
💬 Chat Options:
1. Connect to WebSocket (Realtime)
2. Send HTTP Message (REST API)
3. View Chat History
4. Join Chat Room
5. Create Group
6. Logout
Enter your choice (1-6): 1

🔗 Connected to WebSocket server!

⚡ Realtime Chat Mode
Commands:
  /send <message>     - Send message to current chat room
  /join <room_id>     - Join a chat room
  /typing             - Send typing indicator
  /status <message>   - Update status
  /disconnect         - Disconnect from WebSocket
  /help               - Show this help

Type your commands or messages:

/join direct_1_2
🏠 Joined chat room: direct_1_2

/send Hello! Anyone here?
📤 [14:30] You: Hello! Anyone here?

📥 [14:31] Alice: Hi John! Welcome to the chat!
⌨️ Alice is typing...
📥 [14:32] Alice: How are you doing?

/send I'm great! Thanks for asking
📤 [14:32] You: I'm great! Thanks for asking

/typing
⌨️ Typing indicator sent

/status Available for chat
📊 Status updated: Available for chat

/disconnect
🔌 Disconnected from WebSocket
```

### Session 3: HTTP REST API Mode
```
💬 Chat Options:
1. Connect to WebSocket (Realtime)
2. Send HTTP Message (REST API)
3. View Chat History
4. Join Chat Room
5. Create Group
6. Logout
Enter your choice (1-6): 2

🏠 Chat Room ID: direct_1_2
💬 Message: Hello via HTTP!
✅ Message sent successfully!

💬 Chat Options:
Enter your choice (1-6): 3

🏠 Chat Room ID: direct_1_2

📜 Chat History for Room: direct_1_2
================================
[14:30] You: Hello! Anyone here?
[14:31] Alice: Hi John! Welcome to the chat!
[14:32] Alice: How are you doing?
[14:32] You: I'm great! Thanks for asking
[14:33] You: Hello via HTTP!
```

### Session 4: Group Creation
```
💬 Chat Options:
Enter your choice (1-6): 5

👥 Group Name: Team Project
👤 Participant IDs (comma-separated): user_2, user_3, user_4
✅ Group 'Team Project' created successfully!

💬 Chat Options:
Enter your choice (1-6): 1

🔗 Connected to WebSocket server!

/join group_1234567890
🏠 Joined chat room: group_1234567890

/send Welcome to our project team!
📤 [14:35] You: Welcome to our project team!

📥 [14:36] Alice: Thanks for creating the group!
📥 [14:36] Bob: Excited to work together!
👤 Charlie is now online
```

## 🔧 Advanced Usage

### Multiple Chat Rooms
```bash
# Join different rooms in the same session
/join direct_1_2
🏠 Joined chat room: direct_1_2

/send Hello Alice!
📤 [14:30] You: Hello Alice!

/join group_team
🏠 Joined chat room: group_team

/send Team meeting at 3 PM
📤 [14:31] You: Team meeting at 3 PM

# Switch back to previous room
/join direct_1_2
🏠 Joined chat room: direct_1_2
```

### Status Updates
```bash
/status Working on project
📊 Status updated: Working on project

/status In a meeting
📊 Status updated: In a meeting

/status Available
📊 Status updated: Available
```

### Typing Indicators
```bash
# Send typing indicator
/typing
⌨️ Typing indicator sent

# Others will see:
⌨️ John is typing...
```

## 🌐 HTTP vs WebSocket Comparison

### HTTP Mode (Option 2)
- ✅ Simple request/response
- ✅ Works with poor connectivity
- ✅ Lower battery usage
- ❌ No real-time updates
- ❌ No typing indicators
- ❌ Manual refresh needed

### WebSocket Mode (Option 1)
- ✅ Real-time messaging
- ✅ Typing indicators
- ✅ Live status updates
- ✅ Instant notifications
- ❌ Requires stable connection
- ❌ Higher battery usage

## 🛠️ Troubleshooting

### Connection Issues
```bash
❌ WebSocket connection failed: dial tcp [::1]:3001: connect: connection refused

# Solution: Check if backend WebSocket server is running
cd backend
npm run dev  # Should show "WebSocket server is ready"
```

### Authentication Issues
```bash
❌ Login failed: Invalid credentials

# Solution: Check credentials or register new user
# Or use test users created by backend:
# Email: alice@test.com, Password: password123
# Email: bob@test.com, Password: password123
```

### API Errors
```bash
❌ Failed to send message. Status: 401

# Solution: Login again to refresh token
# Or check if backend server is running on port 3001
```

## 📱 Mobile-like Experience

### Quick Chat Session
```bash
# 1. Quick login
./chat-client
# Choose: 1 (Login) → Enter credentials

# 2. Jump to realtime chat
# Choose: 1 (WebSocket)

# 3. Join room and start chatting
/join my_room
Hello everyone!
How's everyone doing?
/disconnect

# 4. Logout
# Choose: 6 (Logout)
```

### Group Chat Management
```bash
# Create group
# Choose: 5 (Create Group)
# Name: "Family Chat"
# Participants: "mom_id, dad_id, sister_id"

# Join and chat
# Choose: 1 (WebSocket)
/join family_group_id
/send Family dinner at 7 PM tonight!
/status Cooking dinner
```

## 🔄 Integration with Backend

### Test with Backend APIs
```bash
# The client integrates with these backend endpoints:

# Authentication
POST http://localhost:3001/api/auth/login
POST http://localhost:3001/api/auth/register

# Messages
POST http://localhost:3001/api/messages
GET http://localhost:3001/api/messages?chatRoomId=<id>

# Groups
POST http://localhost:3001/api/groups

# WebSocket
ws://localhost:3001
```

### Real Backend Integration
```bash
# 1. Start backend with database
cd backend
docker-compose up -d  # Start PostgreSQL
npm run dev          # Start backend server

# 2. Create test users (optional)
node create-test-user.js

# 3. Use chat client
cd ../chat-client
./chat-client

# 4. Login with test users:
# alice@test.com / password123
# bob@test.com / password123
# charlie@test.com / password123
```

This chat client provides a complete command-line interface for testing and using the WhatsApp-like chat system with both real-time WebSocket and HTTP REST API options!