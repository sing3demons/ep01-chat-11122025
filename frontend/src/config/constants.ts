// Frontend application constants

export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3003';
export const WS_BASE_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:3001';

export const MESSAGE_STATUS = {
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
} as const;

export const CHAT_ROOM_TYPE = {
  DIRECT: 'direct',
  GROUP: 'group',
} as const;

export const NOTIFICATION_TYPE = {
  MESSAGE: 'message',
  MENTION: 'mention',
  GROUP_ACTIVITY: 'group_activity',
} as const;

export const NOTIFICATION_PRIORITY = {
  NORMAL: 'normal',
  HIGH: 'high',
} as const;

export const WEBSOCKET_EVENTS = {
  MESSAGE: 'message',
  TYPING_START: 'typing_start',
  TYPING_STOP: 'typing_stop',
  STATUS_UPDATE: 'status_update',
  NOTIFICATION: 'notification',
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
} as const;

export const CONNECTION_STATUS = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  RECONNECTING: 'reconnecting',
} as const;

export const UI_CONFIG = {
  MESSAGE_LOAD_LIMIT: 50,
  TYPING_TIMEOUT: 3000,
  RECONNECT_INTERVAL: 5000,
  MAX_RECONNECT_ATTEMPTS: 5,
  NOTIFICATION_DURATION: 5000,
} as const;

export const VALIDATION_RULES = {
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 50,
  PASSWORD_MIN_LENGTH: 6,
  MESSAGE_MAX_LENGTH: 4000,
  GROUP_NAME_MAX_LENGTH: 100,
} as const;