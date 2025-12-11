# 🚀 Quick Start Guide

## ⚡ 5-Minute Setup

### 1. **Start Backend Server** (Terminal 1)
```bash
cd backend
docker-compose up -d    # Start database
npm run dev            # Start backend server
```

**✅ Expected Output:**
```
🚀 Server is running on port 3001
📡 WebSocket server is ready
```

### 2. **Build Chat Client** (Terminal 2)
```bash
cd chat-client
go mod tidy
go build -o chat-client main.go
```

### 3. **Run Chat Client**
```bash
./chat-client
```

### 4. **Login with Test User**
```
📋 Choose an option:
1. Login
2. Register
3. Exit
Enter your choice (1-3): 1

📧 Email: alice@test.com
🔒 Password: password123
✅ Login successful! Welcome, alice
```

### 5. **Start Realtime Chat**
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
```

### 6. **Join Room and Chat**
```bash
/join room_123
🏠 Joined chat room: room_123

/send Hello everyone!
📤 [14:30] You: Hello everyone!

# Type regular messages or use commands:
Hello from the chat client!
/typing
/status Available for chat
```

---

## 🎯 Test Scenarios

### **Scenario 1: Two Users Chatting**

**Terminal 1 - Alice:**
```bash
./chat-client
# Login: alice@test.com / password123
# Choose: 1 (WebSocket)
/join room_demo
/send Hi Bob! Are you there?
```

**Terminal 2 - Bob:**
```bash
./chat-client  
# Login: bob@test.com / password123
# Choose: 1 (WebSocket)
/join room_demo
/send Hi Alice! Yes, I'm here!
```

### **Scenario 2: HTTP vs WebSocket**

**HTTP Mode (Reliable):**
```bash
# Choose: 2 (Send HTTP Message)
🏠 Chat Room ID: test_room
💬 Message: This message sent via HTTP
✅ Message sent successfully!
```

**WebSocket Mode (Realtime):**
```bash
# Choose: 1 (Connect to WebSocket)
/join test_room
/send This message sent via WebSocket
📤 [14:30] You: This message sent via WebSocket
```

### **Scenario 3: Group Chat**

**Create Group:**
```bash
# Choose: 5 (Create Group)
👥 Group Name: Team Meeting
👤 Participant IDs: user_2,user_3,user_4
✅ Group 'Team Meeting' created successfully!
```

**Join Group Chat:**
```bash
# Choose: 1 (WebSocket)
/join group_team_meeting
/send Welcome to our team meeting!
```

---

## 🔧 One-Command Setup

### **Using Make (Recommended)**
```bash
# Build and run in one command
cd chat-client
make run
```

### **Using Demo Script**
```bash
cd chat-client
chmod +x demo.sh
./demo.sh
# Choose: 1 (Interactive Demo)
```

---

## 📱 Mobile-Style Quick Chat

### **Express Chat Session (< 2 minutes)**
```bash
./chat-client

# Quick login
1 → alice@test.com → password123

# Jump to realtime
1

# Start chatting
/join quick_chat
Hello! Testing the chat client
How is everyone doing?
/status Online and ready
/disconnect

# Logout
6
```

---

## 🎮 Command Cheat Sheet

### **Main Menu**
```
1 = Login
2 = Register  
3 = Exit
```

### **Chat Menu**
```
1 = WebSocket (Realtime) ⚡
2 = HTTP Message 🌐
3 = Chat History 📜
4 = Join Room 🏠
5 = Create Group 👥
6 = Logout 👋
```

### **WebSocket Commands**
```bash
/send <msg>    # Send message
/join <room>   # Join room
/typing        # Typing indicator
/status <msg>  # Update status
/disconnect    # Leave WebSocket
/help          # Show help
```

---

## 🚨 Troubleshooting Quick Fixes

### **Connection Refused?**
```bash
# Start backend first
cd backend && npm run dev
```

### **Login Failed?**
```bash
# Use test credentials
alice@test.com / password123
bob@test.com / password123
```

### **Build Failed?**
```bash
# Install dependencies
go mod tidy
```

### **WebSocket Not Working?**
```bash
# Use HTTP mode instead
# Choose Option 2 instead of Option 1
```

---

## ✅ Success Checklist

- [ ] Backend server running (`🚀 Server is running on port 3001`)
- [ ] WebSocket ready (`📡 WebSocket server is ready`)
- [ ] Client built successfully (`go build` completes)
- [ ] Login works (`✅ Login successful!`)
- [ ] WebSocket connects (`🔗 Connected to WebSocket server!`)
- [ ] Messages send/receive (`📤 📥` indicators appear)

---

## 🎉 You're Ready!

Once you see these indicators, you have a fully working chat system:

```bash
🔗 Connected to WebSocket server!
🏠 Joined chat room: room_123
📤 [14:30] You: Hello everyone!
📥 [14:31] Alice: Hi there!
⌨️ Bob is typing...
```

**Enjoy your realtime chat experience!** 🚀💬