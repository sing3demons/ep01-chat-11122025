// Integration test setup
import { jest } from '@jest/globals';

// Mock Prisma client to avoid database dependency
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    chatRoom: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    message: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    queuedMessage: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    deviceSession: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    notificationSettings: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    privacySettings: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    chatRoomParticipant: {
      create: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    $disconnect: jest.fn(),
  },
}));

// Mock WebSocket service to avoid actual WebSocket connections
jest.mock('../../websocket/websocket.service', () => ({
  WebSocketService: {
    getInstance: jest.fn(() => ({
      initialize: jest.fn(),
      getConnectionStats: jest.fn(() => ({
        totalConnections: 0,
        activeConnections: 0,
        authenticatedConnections: 0,
        uniqueUsers: 0,
      })),
      cleanup: jest.fn(),
      sendToUser: jest.fn(),
      sendToUsers: jest.fn(),
      broadcast: jest.fn(),
      isUserOnline: jest.fn(() => false),
    })),
  },
}));

// Mock offline service
jest.mock('../../websocket/offline.service', () => ({
  OfflineService: {
    getInstance: jest.fn(() => ({
      queueMessage: jest.fn(),
      processQueue: jest.fn(),
      getQueuedMessages: jest.fn(() => []),
      getOfflineStats: jest.fn(() => ({
        total: 0,
        queued: 0,
        sending: 0,
        failed: 0,
      })),
      registerDeviceSession: jest.fn(),
      synchronizeUserDevices: jest.fn(),
      getDeviceSessions: jest.fn(() => []),
      retryMessageDelivery: jest.fn(),
    })),
  },
}));

// Mock reconnection manager
jest.mock('../../websocket/reconnection.manager', () => ({
  ReconnectionManager: {
    getInstance: jest.fn(() => ({
      initialize: jest.fn(),
      registerConnection: jest.fn(),
      handleDisconnection: jest.fn(),
      handleSuccessfulReconnection: jest.fn(),
      updateConnectionHealth: jest.fn(),
      getConnectionHealth: jest.fn(() => ({ isHealthy: true })),
      getReconnectionStats: jest.fn(() => ({
        totalReconnections: 0,
        successfulReconnections: 0,
        failedReconnections: 0,
      })),
    })),
  },
}));

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';

export {};