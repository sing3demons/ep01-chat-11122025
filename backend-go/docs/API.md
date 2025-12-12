# API Documentation

## Base URL
```
http://localhost:8080/api/v1
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Endpoints

### Authentication

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "token": "jwt_token",
  "user": {
    "id": "uuid",
    "username": "string",
    "email": "string"
  },
  "expires_at": "2023-12-12T10:00:00Z"
}
```

#### Login User
```http
POST /auth/login
Content-Type: application/json

{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "token": "jwt_token",
  "user": {
    "id": "uuid",
    "username": "string",
    "email": "string"
  },
  "expires_at": "2023-12-12T10:00:00Z"
}
```

#### Logout User
```http
POST /auth/logout
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

#### Refresh Token
```http
POST /auth/refresh
Authorization: Bearer <token>
```

**Response:**
```json
{
  "token": "new_jwt_token",
  "user": {
    "id": "uuid",
    "username": "string",
    "email": "string"
  },
  "expires_at": "2023-12-12T10:00:00Z"
}
```

### Chat Rooms

#### Get User's Chat Rooms
```http
GET /chatrooms?page=1&limit=20
Authorization: Bearer <token>
```

**Response:**
```json
{
  "chat_rooms": [
    {
      "id": "uuid",
      "name": "string",
      "description": "string",
      "is_private": false,
      "created_by": "uuid",
      "members": ["uuid1", "uuid2"],
      "created_at": "2023-12-12T10:00:00Z",
      "updated_at": "2023-12-12T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "total_pages": 1
  }
}
```

#### Create Chat Room
```http
POST /chatrooms
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "string",
  "description": "string",
  "is_private": false,
  "members": ["uuid1", "uuid2"]
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "is_private": false,
  "created_by": "uuid",
  "members": ["uuid1", "uuid2"],
  "created_at": "2023-12-12T10:00:00Z",
  "updated_at": "2023-12-12T10:00:00Z"
}
```

#### Get Chat Room
```http
GET /chatrooms/:id
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "is_private": false,
  "created_by": "uuid",
  "members": ["uuid1", "uuid2"],
  "created_at": "2023-12-12T10:00:00Z",
  "updated_at": "2023-12-12T10:00:00Z"
}
```

#### Join Chat Room
```http
POST /chatrooms/:id/join
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Joined chat room successfully"
}
```

#### Leave Chat Room
```http
POST /chatrooms/:id/leave
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Left chat room successfully"
}
```

### Messages (Coming Soon)

#### Get Messages
```http
GET /chatrooms/:room_id/messages?page=1&limit=50&before=message_id
Authorization: Bearer <token>
```

#### Send Message
```http
POST /chatrooms/:room_id/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "string",
  "type": "text"
}
```

#### Get Message
```http
GET /messages/:id
Authorization: Bearer <token>
```

#### Update Message Status
```http
PUT /messages/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "read"
}
```

#### Delete Message
```http
DELETE /messages/:id
Authorization: Bearer <token>
```

## WebSocket

### Connection
```
ws://localhost:8080/ws?token=<jwt_token>
```

### Events

#### Client to Server

**Join Room:**
```json
{
  "type": "join_room",
  "room_id": "uuid"
}
```

**Leave Room:**
```json
{
  "type": "leave_room",
  "room_id": "uuid"
}
```

**Send Message:**
```json
{
  "type": "message",
  "room_id": "uuid",
  "content": "Hello, World!"
}
```

**Typing Indicator:**
```json
{
  "type": "typing",
  "room_id": "uuid"
}
```

**Ping:**
```json
{
  "type": "ping"
}
```

#### Server to Client

**Connected:**
```json
{
  "type": "connected",
  "timestamp": "2023-12-12T10:00:00Z"
}
```

**Room Joined:**
```json
{
  "type": "room_joined",
  "room_id": "uuid",
  "timestamp": "2023-12-12T10:00:00Z"
}
```

**Room Left:**
```json
{
  "type": "room_left",
  "room_id": "uuid",
  "timestamp": "2023-12-12T10:00:00Z"
}
```

**New Message:**
```json
{
  "type": "new_message",
  "message_id": "uuid",
  "room_id": "uuid",
  "sender_id": "uuid",
  "content": "Hello, World!",
  "message_type": "text",
  "status": "sent",
  "created_at": "2023-12-12T10:00:00Z"
}
```

**Typing Indicator:**
```json
{
  "type": "typing",
  "room_id": "uuid",
  "sender_id": "uuid",
  "timestamp": "2023-12-12T10:00:00Z"
}
```

**Pong:**
```json
{
  "type": "pong",
  "timestamp": "2023-12-12T10:00:00Z"
}
```

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "error": "Error message description"
}
```

### Common HTTP Status Codes

- `200 OK` - Success
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required or invalid
- `403 Forbidden` - Access denied
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

## Rate Limiting

API endpoints are rate limited to prevent abuse. Default limits:
- 100 requests per minute per IP address
- WebSocket connections: 10 per user

## Examples

### Complete Authentication Flow

```bash
# 1. Register
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'

# 2. Login
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }' | jq -r '.token')

# 3. Create chat room
curl -X POST http://localhost:8080/api/v1/chatrooms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "My Chat Room",
    "description": "A test chat room",
    "is_private": false
  }'

# 4. Get chat rooms
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/chatrooms
```