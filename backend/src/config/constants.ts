/**
 * Application Constants
 */

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const JWT_CONFIG = {
  EXPIRES_IN: '24h',
  ALGORITHM: 'HS256',
  REFRESH_EXPIRES_IN: '7d',
} as const;

export const SECURITY_CONFIG = {
  PASSWORD_HASH_ROUNDS: 12,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_TIME: 15 * 60 * 1000, // 15 minutes
} as const;

export const VALIDATION_RULES = {
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 30,
  MESSAGE_MAX_LENGTH: 1000,
  GROUP_NAME_MAX_LENGTH: 50,
  EMAIL_MAX_LENGTH: 255,
} as const;

export const WEBSOCKET_EVENTS = {
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  MESSAGE: 'message',
  TYPING_START: 'typing_start',
  TYPING_STOP: 'typing_stop',
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline',
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  NOTIFICATION: 'notification',
} as const;

export const MESSAGE_STATUS = {
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
} as const;

export const CHAT_ROOM_TYPES = {
  DIRECT: 'direct',
  GROUP: 'group',
} as const;

export const USER_ROLES = {
  ADMIN: 'admin',
  MEMBER: 'member',
} as const;

export const NOTIFICATION_TYPES = {
  MESSAGE: 'message',
  MENTION: 'mention',
  GROUP_INVITE: 'group_invite',
  GROUP_ACTIVITY: 'group_activity',
  SYSTEM: 'system',
} as const;

export const NOTIFICATION_PRIORITIES = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;