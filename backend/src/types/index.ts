// Type definitions for the chat system
// Re-export all model types for backward compatibility and centralized access

import { ICustomLogger } from '@/logger/logger';

export * from '../user';
export * from '../message';
export * from '../chatroom';
export * from '../notification';

// Legacy interfaces for backward compatibility
export interface AuthToken {
  userId: string;
  username: string;
  email: string;
  iat: number;
  exp: number;
}

export interface WebSocketConnection {
  id: string;
  userId: string;
  socket: any;
  isActive: boolean;
  connectedAt: Date;
}

export interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

// Express Request extension
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        email: string;
        isOnline: boolean;
        lastSeen: Date;
        createdAt: Date;
      };
      logger: ICustomLogger
    }
  }
}