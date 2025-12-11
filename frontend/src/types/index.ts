// Core interface definitions for the frontend

export interface Message {
  id: string;
  content: string;
  senderId: string;
  chatRoomId: string;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
}

export interface User {
  id: string;
  username: string;
  email: string;
  isOnline: boolean;
  lastSeen: Date;
  createdAt?: Date;
}

export interface ChatRoom {
  id: string;
  name?: string;
  type: 'direct' | 'group';
  participants: string[];
  createdAt: Date;
  lastMessageAt: Date;
}

export interface Notification {
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

export interface NotificationSettings {
  userId: string;
  soundEnabled: boolean;
  desktopNotifications: boolean;
  mentionNotifications: boolean;
  groupNotifications: boolean;
}

export interface WebSocketMessage {
  type: 'message' | 'typing' | 'status' | 'notification';
  payload: any;
  timestamp: Date;
}

export interface TypingIndicator {
  userId: string;
  chatRoomId: string;
  isTyping: boolean;
}

export interface ConnectionStatus {
  isConnected: boolean;
  lastConnected?: Date;
  reconnectAttempts: number;
}

// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}