# 🛠️ Chat Client Troubleshooting Guide

## ❌ Common Issues & Solutions

### 🔌 WebSocket Connection Issues

#### Problem: `dial tcp [::1]:3001: connect: connection refused`
```
❌ WebSocket connection failed: dial tcp [::1]:3001: connect: connection refused
```

**Solutions:**

1. **Start Backend Server**
   ```bash
   cd backend
   npm run dev
   ```
   
   ✅ **Expected Output:**
   ```
   🚀 Server is running on port 3001
   📡 WebSocket server is ready
   ```

2. **Check Server Status**
   ```bash
   curl http://localhost:3001/api/health
   ```
   
   ✅ **Expected Response:**
   ```json
   {"success":true,"message":"Server is healthy"}
   ```

3. **Verify WebSocket Port**
   ```bash
   netstat -an | grep 3001
   # or
   lsof -i :3001
   ```

4. **Use HTTP Mode as Fallback**
   - If WebSocket fails, choose **Option 2** (Send HTTP Message)
   - HTTP mode works independently of WebSocket

---

### 🔐 Authentication Issues

#### Problem: `❌ Login failed: Invalid credentials`

**Solutions:**

1. **Use Test Users**
   ```
   Email: alice@test.com
   Password: password123
   
   Email: bob@test.com
   Password: password123
   
   Email: charlie@test.com
   Password: password123
   ```

2. **Create Test Users**
   ```bash
   cd backend
   node create-test-user.js
   ```

3. **Register New User**
   - Choose **Option 2** (Register) in main menu
   - Create new account with unique email

#### Problem: `❌ Failed to send message. Status: 401`

**Solutions:**

1. **Re-login**
   - JWT token might be expired
   - Choose **Option 6** (Logout) then login again

2. **Check Backend Server**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        http://localhost:3001/api/notifications
   ```

---

### 🌐 Network & Connection Issues

#### Problem: `❌ Failed to create request: connection refused`

**Solutions:**

1. **Check Backend URL**
   - Default: `http://localhost:3001`
   - Verify server is running on correct port

2. **Check Firewall**
   ```bash
   # macOS
   sudo pfctl -sr | grep 3001
   
   # Linux
   sudo ufw status
   
   # Windows
   netsh advfirewall show allprofiles
   ```

3. **Test Network Connectivity**
   ```bash
   ping localhost
   telnet localhost 3001
   ```

---

### 🏗️ Build Issues

#### Problem: `go: module not found`

**Solutions:**

1. **Initialize Go Module**
   ```bash
   cd chat-client
   go mod init chat-client
   go mod tidy
   ```

2. **Install Dependencies**
   ```bash
   go get github.com/gorilla/websocket
   ```

3. **Clean and Rebuild**
   ```bash
   go clean
   go build -o chat-client main.go
   ```

#### Problem: `command not found: go`

**Solutions:**

1. **Install Go**
   ```bash
   # macOS
   brew install go
   
   # Ubuntu/Debian
   sudo apt install golang-go
   
   # Windows
   # Download from https://golang.org/dl/
   ```

2. **Set Go Path**
   ```bash
   export PATH=$PATH:/usr/local/go/bin
   export GOPATH=$HOME/go
   ```

---

### 💬 Chat Functionality Issues

#### Problem: `⚠️ Join a chat room first using /join <room_id>`

**Solutions:**

1. **Join Room Before Sending**
   ```bash
   /join room_123
   /send Hello everyone!
   ```

2. **Use Menu Option 4**
   - Choose **Option 4** (Join Chat Room)
   - Enter room ID manually

3. **Create Group First**
   - Choose **Option 5** (Create Group)
   - Then join the created group

#### Problem: Messages not appearing in realtime

**Solutions:**

1. **Check WebSocket Connection**
   ```bash
   # In chat client
   /disconnect
   # Then reconnect via Option 1
   ```

2. **Use HTTP Mode**
   - Choose **Option 2** (Send HTTP Message)
   - Choose **Option 3** (View Chat History)

3. **Verify Room ID**
   - Make sure all users are in the same room
   - Room IDs are case-sensitive

---

## 🔧 Quick Diagnostics

### 1. **Full System Check**
```bash
# Run this script to check everything
cd chat-client
./demo.sh
# Choose Option 2 (API Test)
```

### 2. **Backend Health Check**
```bash
curl -s http://localhost:3001/api/health | jq '.'
```

### 3. **Database Check**
```bash
cd backend
docker-compose ps
# Should show postgres and redis as "Up"
```

### 4. **WebSocket Test**
```bash
# Install wscat if needed
npm install -g wscat

# Test WebSocket connection
wscat -c ws://localhost:3001
```

---

## 🚀 Step-by-Step Recovery

### Complete Reset Process

1. **Stop Everything**
   ```bash
   # Stop chat client (Ctrl+C)
   # Stop backend server (Ctrl+C)
   ```

2. **Restart Backend**
   ```bash
   cd backend
   docker-compose up -d  # Start database
   npm run dev          # Start backend server
   ```

3. **Verify Backend**
   ```bash
   curl http://localhost:3001/api/health
   ```

4. **Rebuild Client**
   ```bash
   cd chat-client
   go build -o chat-client main.go
   ```

5. **Test Client**
   ```bash
   ./chat-client
   # Try Option 1 (Login) with test credentials
   ```

---

## 📞 Getting Help

### Debug Information to Collect

When reporting issues, include:

1. **System Info**
   ```bash
   go version
   uname -a
   ```

2. **Backend Status**
   ```bash
   curl http://localhost:3001/api/health
   ```

3. **Error Messages**
   - Copy exact error messages
   - Include full stack traces

4. **Network Status**
   ```bash
   netstat -an | grep 3001
   ```

### Common Error Patterns

| Error Message | Likely Cause | Quick Fix |
|---------------|--------------|-----------|
| `connection refused` | Backend not running | `npm run dev` |
| `Invalid credentials` | Wrong login info | Use test users |
| `Status: 401` | Token expired | Re-login |
| `command not found` | Go not installed | Install Go |
| `module not found` | Missing dependencies | `go mod tidy` |

---

## ✅ Success Indicators

### Healthy System Shows:
```bash
# Backend logs
🚀 Server is running on port 3001
📡 WebSocket server is ready

# Client connection
🔗 Connected to WebSocket server!
🏠 Joined chat room: room_123

# Message flow
📤 [14:30] You: Hello!
📥 [14:31] Alice: Hi there!
```

### Performance Benchmarks:
- **Login**: < 2 seconds
- **WebSocket Connect**: < 1 second  
- **Message Send**: < 100ms
- **Message Receive**: < 50ms

Follow this guide to resolve most common issues with the chat client! 🎯