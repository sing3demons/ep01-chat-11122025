// Main application exports
export { default as app } from './server';

// Auth module
export * from './auth';

// User module
export { 
  UserController, 
  UserService, 
  UserRepository, 
  UserModel, 
  UserConverter,
  userRoutes 
} from './user';

// Message module
export { 
  MessageController, 
  MessageService, 
  MessageModel, 
  MessageConverter,
  messageRoutes 
} from './message';

// ChatRoom module
export { 
  ChatRoomController, 
  ChatRoomService, 
  ChatRoomRepository, 
  ChatRoomModel, 
  ChatRoomConverter,
  chatroomRoutes 
} from './chatroom';

// Notification module
export { 
  NotificationController, 
  NotificationService, 
  NotificationRepository, 
  NotificationModel, 
  NotificationConverter,
  notificationRoutes 
} from './notification';

// Middleware
export { AuthMiddleware } from './middleware/auth';

// Types (excluding duplicates from auth)
export { 
  AuthToken, 
  ApiResponse 
} from './types';

// WebSocket module
export { 
  WebSocketManager, 
  WebSocketService, 
  WebSocketConnection, 
  WebSocketMessage 
} from './websocket';

// Utils
export { JWTUtils } from './utils/jwt';
export { PasswordUtils } from './utils/password';
export { ValidationUtils } from './utils/validation';
export { EncryptionUtils } from './utils/encryption';

// Config
export { default as prisma } from './config/database';
export * from './config/constants';