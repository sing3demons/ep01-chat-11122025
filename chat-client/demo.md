# Demo: การทดสอบ WhatsApp Chat Client

## เตรียมความพร้อม

### 1. เริ่ม Backend Server
```bash
cd backend
npm start
```

### 2. เปิด 2 Terminals สำหรับทดสอบ real-time chat

**Terminal 1 (Alice):**
```bash
cd chat-client
./run.sh http://localhost:3001
```

**Terminal 2 (Bob):**
```bash
cd chat-client  
./run.sh http://localhost:3001
```

## ขั้นตอนการทดสอบ

### Step 1: ลงทะเบียนผู้ใช้

**Terminal 1 (Alice):**
```
=== Authentication ===
1. Login
2. Register
Choose option: 2

Username: alice
Email: alice@example.com
Password: alice123
```

**Terminal 2 (Bob):**
```
=== Authentication ===
1. Login
2. Register
Choose option: 2

Username: bob
Email: bob@example.com
Password: bob123
```

### Step 2: Alice สร้างห้องแชท

**Terminal 1 (Alice):**
```
=== WhatsApp Chat Client ===
1. List chat rooms
2. Create new chat room
3. Join chat room
4. Send message
5. View messages
6. Exit
Choose option: 2

Room name (optional): Alice & Bob Chat
Room type (direct/group): direct
Participant emails (comma-separated): bob@example.com
```

### Step 3: Alice เข้าร่วมห้องแชท

**Terminal 1 (Alice):**
```
Choose option: 3
Enter room number to join: 1
```

### Step 4: Bob ดูห้องแชทและเข้าร่วม

**Terminal 2 (Bob):**
```
Choose option: 1
📋 Your Chat Rooms:
1. Alice & Bob Chat (direct) - 2 participants

Choose option: 3
Enter room number to join: 1
```

### Step 5: ทดสอบ Real-time Chat

**Terminal 1 (Alice):**
```
Choose option: 4
Enter message (or 'exit' to stop): Hello Bob! 👋
✅ Sent: Hello Bob! 👋
> How are you today?
✅ Sent: How are you today?
```

**Terminal 2 (Bob) - จะเห็นข้อความ real-time:**
```
💬 New message: Hello Bob! 👋
> 
💬 New message: How are you today?
> 
```

**Terminal 2 (Bob) - ตอบกลับ:**
```
Choose option: 4
Enter message (or 'exit' to stop): Hi Alice! I'm doing great! 😊
✅ Sent: Hi Alice! I'm doing great! 😊
> Thanks for asking!
✅ Sent: Thanks for asking!
```

### Step 6: ดูประวัติข้อความ

**Terminal 1 (Alice):**
```
Choose option: 5
💬 Messages:
[14:30] You: Hello Bob! 👋
[14:30] You: How are you today?
[14:31] bob12345: Hi Alice! I'm doing great! 😊
[14:31] bob12345: Thanks for asking!
```

## ฟีเจอร์ที่ทดสอบได้

### ✅ Authentication
- [x] ลงทะเบียนผู้ใช้ใหม่
- [x] เข้าสู่ระบบ
- [x] JWT token authentication

### ✅ Chat Rooms
- [x] สร้างห้องแชท (direct/group)
- [x] ดูรายการห้องแชท
- [x] เข้าร่วมห้องแชท

### ✅ Messaging
- [x] ส่งข้อความ
- [x] รับข้อความ real-time
- [x] ดูประวัติข้อความ

### ✅ Real-time Features
- [x] WebSocket connection
- [x] Live message updates
- [x] Multiple users chatting

## การทดสอบเพิ่มเติม

### Group Chat
1. สร้างห้องแชทแบบ group
2. เชิญผู้ใช้หลายคน
3. ทดสอบ group messaging

### Multiple Rooms
1. สร้างหลายห้องแชท
2. สลับระหว่างห้อง
3. ทดสอบการแยกข้อความ

### Error Handling
1. ทดสอบ login ด้วยข้อมูลผิด
2. ทดสอบส่งข้อความโดยไม่เข้าห้อง
3. ทดสอบการตัดการเชื่อมต่อ

## Tips การใช้งาน

- **Real-time Updates**: ข้อความใหม่จะปรากฏทันทีในทุก client ที่เชื่อมต่อ
- **Multiple Sessions**: สามารถเปิดหลาย terminal เพื่อทดสอบ multi-user
- **Exit Gracefully**: ใช้ option 6 เพื่อออกจากโปรแกรม
- **Message History**: ใช้ option 5 เพื่อดูประวัติข้อความ

## Troubleshooting

**ไม่เห็นข้อความ real-time:**
- ตรวจสอบ WebSocket connection
- ตรวจสอบว่าอยู่ในห้องเดียวกัน

**Authentication Error:**
- ตรวจสอบ backend server
- ลองลงทะเบียนผู้ใช้ใหม่

**Connection Failed:**
- ตรวจสอบ backend URL
- ตรวจสอบว่า backend รันอยู่