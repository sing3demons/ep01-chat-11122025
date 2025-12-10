# WhatsApp Chat Client Features

## 🎯 Overview
Mini chat application เขียนด้วย Golang สำหรับทดสอบ WhatsApp Chat System Backend ผ่าน console/terminal

## ✨ Core Features

### 🔐 Authentication System
- **User Registration**: ลงทะเบียนผู้ใช้ใหม่ด้วย username, email, password
- **User Login**: เข้าสู่ระบบด้วย email และ password  
- **JWT Token**: ใช้ JWT token สำหรับ authentication
- **Session Management**: จัดการ session และ token อัตโนมัติ

### 💬 Real-time Messaging
- **WebSocket Connection**: เชื่อมต่อ WebSocket สำหรับ real-time communication
- **Live Message Updates**: รับข้อความใหม่ทันทีโดยไม่ต้อง refresh
- **Message History**: ดูประวัติข้อความในห้องแชท
- **Message Status**: ติดตาม status การส่งข้อความ

### 🏠 Chat Room Management
- **Create Rooms**: สร้างห้องแชทใหม่ (direct หรือ group)
- **Join Rooms**: เข้าร่วมห้องแชทที่มีอยู่
- **List Rooms**: ดูรายการห้องแชททั้งหมด
- **Room Types**: รองรับทั้ง direct chat และ group chat

### 🖥️ Console Interface
- **Menu-driven UI**: ใช้งานผ่าน menu ที่เข้าใจง่าย
- **Interactive Input**: รับ input จากผู้ใช้แบบ interactive
- **Real-time Display**: แสดงข้อความใหม่ทันทีใน console
- **Status Indicators**: แสดง status และ feedback ต่างๆ

## 🔧 Technical Features

### 📡 API Integration
- **REST API Calls**: เรียกใช้ backend API endpoints
- **HTTP Client**: ใช้ Go's http.Client สำหรับ API calls
- **JSON Handling**: Parse และ serialize JSON data
- **Error Handling**: จัดการ error จาก API calls

### 🔌 WebSocket Support
- **Gorilla WebSocket**: ใช้ gorilla/websocket library
- **Concurrent Listening**: ฟัง WebSocket messages ใน goroutine แยก
- **Message Types**: รองรับ message types ต่างๆ
- **Connection Management**: จัดการการเชื่อมต่อ WebSocket

### 🏗️ Architecture
- **Modular Design**: แยก functions ตาม responsibility
- **Struct-based**: ใช้ struct สำหรับ data models
- **Clean Code**: เขียน code ที่อ่านง่ายและ maintainable
- **Error Propagation**: จัดการ error แบบ Go idioms

## 🎮 User Experience

### 📋 Menu System
```
=== WhatsApp Chat Client ===
1. List chat rooms
2. Create new chat room  
3. Join chat room
4. Send message
5. View messages
6. Exit
```

### 💭 Chat Experience
- **Continuous Messaging**: ส่งข้อความต่อเนื่องได้
- **Live Updates**: เห็นข้อความจากคนอื่นทันที
- **Message Threading**: ข้อความแสดงตาม timeline
- **User Identification**: แยกแยะข้อความของตัวเองและคนอื่น

### 🔄 Real-time Notifications
```
💬 New message: Hello there!
⌨️  Someone is typing...
✅ Sent: Your message here
```

## 🛠️ Development Tools

### 📦 Build System
- **Go Modules**: ใช้ Go modules สำหรับ dependency management
- **Makefile**: รวม commands ที่ใช้บ่อย
- **Build Scripts**: script สำหรับ build และ run
- **Cross-platform**: รันได้บน Linux, macOS, Windows

### 🧪 Testing Support
- **Build Testing**: ทดสอบการ build
- **Connection Testing**: ทดสอบการเชื่อมต่อ backend
- **Demo Scripts**: มี demo และ instructions ครบถ้วน

## 🔗 Backend Integration

### 📍 API Endpoints Used
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User authentication  
- `GET /api/chatrooms` - List chat rooms
- `POST /api/chatrooms` - Create chat room
- `POST /api/messages` - Send message
- `GET /api/messages/:roomId` - Get messages
- `WS /ws` - WebSocket connection

### 🔒 Security
- **JWT Authentication**: ใช้ JWT token ใน Authorization header
- **Secure WebSocket**: ส่ง token ผ่าน WebSocket header
- **Input Validation**: validate input ก่อนส่งไป backend
- **Error Handling**: จัดการ authentication errors

## 🚀 Getting Started

### Quick Start
```bash
# 1. Start backend
cd backend && npm start

# 2. Run client
cd chat-client && make run

# 3. Follow on-screen instructions
```

### Multi-user Testing
```bash
# Terminal 1
make run

# Terminal 2  
make run

# Chat between terminals!
```

## 📈 Performance

### ⚡ Efficiency
- **Lightweight**: minimal dependencies
- **Fast Startup**: เริ่มต้นได้เร็ว
- **Low Memory**: ใช้ memory น้อย
- **Concurrent**: handle WebSocket ใน goroutine แยก

### 🔄 Reliability
- **Error Recovery**: handle network errors
- **Connection Retry**: reconnect เมื่อขาดการเชื่อมต่อ
- **Graceful Shutdown**: ปิดโปรแกรมอย่างถูกต้อง
- **Input Validation**: validate user input

## 🎯 Use Cases

### 👨‍💻 Development Testing
- ทดสอบ backend API endpoints
- ทดสอบ WebSocket functionality  
- ทดสอบ real-time messaging
- ทดสอบ multi-user scenarios

### 🔍 Demo & Presentation
- แสดง chat system capabilities
- demo real-time features
- ทดสอบกับ stakeholders
- proof of concept

### 🧪 Integration Testing
- ทดสอบ API integration
- ทดสอบ authentication flow
- ทดสอบ message delivery
- ทดสอบ error handling

## 🔮 Future Enhancements

### 🎨 UI Improvements
- [ ] Better console formatting
- [ ] Color-coded messages
- [ ] Emoji support
- [ ] Message timestamps

### 🚀 Advanced Features  
- [ ] File sharing
- [ ] Group management
- [ ] User status (online/offline)
- [ ] Message search

### 🔧 Technical Improvements
- [ ] Configuration file
- [ ] Logging system
- [ ] Metrics collection
- [ ] Auto-reconnection