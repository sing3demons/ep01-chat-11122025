# Design Document

## Overview

ระบบแชทแบบเรียลไทม์ที่ใช้สถาปัตยกรรม client-server พร้อม WebSocket สำหรับการสื่อสารแบบ real-time รองรับการส่งข้อความ การจัดการกลุ่ม และการแสดงสถานะออนไลน์ ระบบจะใช้ React สำหรับ frontend, Node.js/Express สำหรับ backend และ PostgreSQL สำหรับฐานข้อมูล

## Architecture

### System Architecture
```
┌─────────────────┐    WebSocket/HTTP    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │ ◄─────────────────► │  Node.js Server │ ◄──► │   PostgreSQL    │
│   (Frontend)    │                     │   (Backend)     │    │   (Database)    │
└─────────────────┘                     └─────────────────┘    └─────────────────┘
```

### Technology Stack
- **Frontend**: React with TypeScript, native WebSocket API
- **Backend**: Node.js, Express, ws (WebSocket library), TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Real-time Communication**: Native WebSocket with ws library
- **Authentication**: JWT tokens
- **Testing**: Jest for unit tests, fast-check for property-based testing

## Components and Interfaces

### Frontend Components
1. **ChatInterface**: หน้าจอหลักสำหรับแสดงการสนทนา
2. **MessageList**: แสดงรายการข้อความในแชท
3. **MessageInput**: ช่องสำหรับพิมพ์และส่งข้อความ
4. **ContactList**: แสดงรายชื่อผู้ติดต่อและสถานะออนไลน์
5. **GroupManager**: จัดการการสร้างและแก้ไขกลุ่มแชท
6. **NotificationManager**: จัดการการแสดงการแจ้งเตือนแบบเรียลไทม์
7. **NotificationBadge**: แสดงจำนวนข้อความที่ยังไม่ได้อ่าน

### Backend Services
1. **AuthService**: จัดการการยืนยันตัวตน
2. **MessageService**: จัดการการส่งและรับข้อความ
3. **UserService**: จัดการข้อมูลผู้ใช้และสถานะออนไลน์
4. **GroupService**: จัดการกลุ่มแชทและสมาชิก
5. **WebSocketManager**: จัดการการเชื่อมต่อ WebSocket แบบ native
6. **NotificationService**: จัดการการส่งการแจ้งเตือนแบบเรียลไทม์

### API Interfaces
```typescript
interface Message {
  id: string;
  content: string;
  senderId: string;
  chatRoomId: string;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
}

interface User {
  id: string;
  username: string;
  email: string;
  isOnline: boolean;
  lastSeen: Date;
}

interface ChatRoom {
  id: string;
  name?: string;
  type: 'direct' | 'group';
  participants: string[];
  createdAt: Date;
  lastMessageAt: Date;
}

interface Notification {
  id: string;
  userId: string;
  type: 'message' | 'mention' | 'group_activity';
  title: string;
  content: string;
  chatRoomId: string;
  isRead: boolean;
  priority: 'normal' | 'high';
  createdAt: Date;
}

interface NotificationSettings {
  userId: string;
  soundEnabled: boolean;
  desktopNotifications: boolean;
  mentionNotifications: boolean;
  groupNotifications: boolean;
}
```

## Data Models

### Database Schema
```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chat rooms table
CREATE TABLE chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100),
  type VARCHAR(20) NOT NULL CHECK (type IN ('direct', 'group')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  sender_id UUID NOT NULL REFERENCES users(id),
  chat_room_id UUID NOT NULL REFERENCES chat_rooms(id),
  status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chat room participants table
CREATE TABLE chat_room_participants (
  chat_room_id UUID REFERENCES chat_rooms(id),
  user_id UUID REFERENCES users(id),
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (chat_room_id, user_id)
);

-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(20) NOT NULL CHECK (type IN ('message', 'mention', 'group_activity')),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  chat_room_id UUID REFERENCES chat_rooms(id),
  is_read BOOLEAN DEFAULT false,
  priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('normal', 'high')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notification settings table
CREATE TABLE notification_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  sound_enabled BOOLEAN DEFAULT true,
  desktop_notifications BOOLEAN DEFAULT true,
  mention_notifications BOOLEAN DEFAULT true,
  group_notifications BOOLEAN DEFAULT true,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After reviewing all testable properties from the prework analysis, several redundancies were identified:
- Properties 1.4 and 1.5 (message status updates) can be combined into a comprehensive message status lifecycle property
- Properties 3.1 and 3.2 (online/offline status) can be combined into a status transition property
- Properties 2.1 and 2.5 (group creation and admin management) overlap and can be consolidated

### Core Properties

**Property 1: Message delivery consistency**
*For any* valid message sent between users, the message should be delivered to the intended recipient(s) and appear in their chat interface with correct sender and timestamp information
**Validates: Requirements 1.1, 1.2**

**Property 2: Message status lifecycle**
*For any* message sent in the system, the status should progress logically from 'sent' → 'delivered' → 'read' and never regress to a previous state
**Validates: Requirements 1.4, 1.5**

**Property 3: Typing indicator synchronization**
*For any* user typing in a chat, all other participants in that chat should see the typing indicator while typing is active
**Validates: Requirements 1.3**

**Property 4: Group message broadcast**
*For any* message sent to a group chat, all current group members should receive the message
**Validates: Requirements 2.3**

**Property 5: Group membership management**
*For any* group chat, when an admin removes a member, that user should no longer receive new messages or have access to group functions
**Validates: Requirements 2.4**

**Property 6: Group admin privileges**
*For any* user with admin role in a group, they should be able to manage group settings and member permissions, while non-admin members cannot
**Validates: Requirements 2.1, 2.5**

**Property 7: User status transitions**
*For any* user, when they come online or go offline, their status should be updated consistently across all contacts' views
**Validates: Requirements 3.1, 3.2**

**Property 8: Online status maintenance**
*For any* active user, their online status should remain true while they are actively using the application
**Validates: Requirements 3.3**

**Property 9: Contact list status display**
*For any* contact list view, each contact should display their current accurate online status or last seen information based on privacy settings
**Validates: Requirements 3.4, 3.5**

**Property 10: Contact management**
*For any* user adding a contact, the contact should be stored and messaging should be enabled between them
**Validates: Requirements 4.1**

**Property 11: Message search accuracy**
*For any* search query in chat history, all returned results should contain the search terms and be relevant to the query
**Validates: Requirements 4.2**

**Property 12: Chat deletion isolation**
*For any* user deleting a chat, the conversation should be removed from their view only while remaining visible to other participants
**Validates: Requirements 4.3**

**Property 13: Chat list ordering**
*For any* user's chat list, conversations should be ordered by last message timestamp in descending order
**Validates: Requirements 4.4**

**Property 14: User blocking bidirectional**
*For any* user blocking another user, message delivery should be prevented in both directions
**Validates: Requirements 4.5**

**Property 15: Offline message queuing**
*For any* messages sent while disconnected, they should be queued and delivered when connection is restored
**Validates: Requirements 5.1**

**Property 16: Cross-device synchronization**
*For any* user switching devices, their chat history and current state should be synchronized and consistent across devices
**Validates: Requirements 5.2**

**Property 17: Connection status feedback**
*For any* connection issue, the system should provide clear visual feedback about the current connection status
**Validates: Requirements 5.4**

**Property 18: Message retry mechanism**
*For any* failed message send, the system should attempt retry and show appropriate error indicators if delivery ultimately fails
**Validates: Requirements 5.5**

**Property 19: Message encryption**
*For any* message transmitted over the network, the content should be encrypted during transport
**Validates: Requirements 6.1**

**Property 20: Authentication requirement**
*For any* login attempt, the user must be successfully authenticated before gaining access to chat functions
**Validates: Requirements 6.3**

**Property 21: Privacy settings enforcement**
*For any* configured privacy setting, the system should respect and enforce those settings for information sharing
**Validates: Requirements 7.5**

**Property 22: Real-time notification delivery**
*For any* new message received when user is not actively viewing the chat, a notification should be displayed immediately with sender name and message preview
**Validates: Requirements 6.1**

**Property 23: Unread message badge accuracy**
*For any* chat with unread messages, the notification badge should display the correct count of unread messages
**Validates: Requirements 6.2**

**Property 24: Mention notification priority**
*For any* message containing a user mention in a group chat, the notification should be marked with high priority and special highlighting
**Validates: Requirements 6.3**

**Property 25: Notification sound preferences**
*For any* notification triggered, sound alerts should be played only when user preferences allow it
**Validates: Requirements 6.4**

**Property 26: Notification settings enforcement**
*For any* configured notification setting, the system should respect user preferences for notification types and timing
**Validates: Requirements 6.5**

## Error Handling

### Connection Errors
- Native WebSocket disconnection handling with automatic reconnection
- Message queuing during offline periods
- Clear user feedback for connection status
- Custom heartbeat mechanism for connection monitoring

### Authentication Errors
- Invalid credentials handling
- Token expiration management
- Secure session management

### Message Delivery Errors
- Failed send retry mechanism
- Timeout handling for message delivery
- Error status indicators for users

### Data Validation Errors
- Input sanitization for messages
- User data validation
- Malformed request handling

### Notification Errors
- Failed notification delivery handling
- Browser notification permission management
- Sound playback error handling
- Notification queue overflow management

## Testing Strategy

### Dual Testing Approach
The system will use both unit testing and property-based testing to ensure comprehensive coverage:

- **Unit tests** verify specific examples, edge cases, and error conditions
- **Property tests** verify universal properties that should hold across all inputs
- Together they provide comprehensive coverage: unit tests catch concrete bugs, property tests verify general correctness

### Unit Testing
Unit tests will cover:
- Specific API endpoint behaviors
- Database operation examples
- WebSocket connection scenarios
- Authentication flow examples
- Error condition handling

### Property-Based Testing
Property-based testing will use **fast-check** library for JavaScript/TypeScript with the following requirements:
- Each property-based test must run a minimum of 100 iterations
- Each test must be tagged with a comment referencing the design document property
- Tag format: **Feature: whatsapp-chat-system, Property {number}: {property_text}**
- Each correctness property must be implemented by a single property-based test

### Test Configuration
- Unit tests: Jest framework
- Property tests: fast-check library
- Integration tests: Supertest for API testing
- WebSocket tests: ws library testing utilities
- End-to-end tests: Playwright for full user flows

### Test Data Generation
Smart generators will be created for:
- Valid user data with realistic constraints
- Message content with various lengths and characters
- Chat room configurations with different participant counts
- Network condition simulations for offline/online scenarios
- Notification scenarios with different types and priorities
- User preference configurations for notification settings