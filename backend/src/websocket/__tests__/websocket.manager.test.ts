import { WebSocketManager } from '../websocket.manager';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

describe('WebSocketManager', () => {
  let server: any;
  let wss: WebSocketServer;
  let wsManager: WebSocketManager;

  beforeAll(() => {
    server = createServer();
    wss = new WebSocketServer({ server });
    wsManager = new WebSocketManager(wss);
  });

  afterAll(() => {
    wsManager.cleanup();
    wss.close();
    server.close();
  });

  describe('Connection Management', () => {
    test('should initialize with empty connections', () => {
      const stats = wsManager.getConnectionStats();
      expect(stats.totalConnections).toBe(0);
      expect(stats.activeConnections).toBe(0);
      expect(stats.authenticatedConnections).toBe(0);
      expect(stats.uniqueUsers).toBe(0);
    });

    test('should check user online status', () => {
      const isOnline = wsManager.isUserOnline('test-user-id');
      expect(isOnline).toBe(false);
    });

    test('should get empty user connections for non-existent user', () => {
      const connections = wsManager.getUserConnections('test-user-id');
      expect(connections).toEqual([]);
    });
  });

  describe('Message Broadcasting', () => {
    test('should handle sendToUser for non-existent user gracefully', () => {
      expect(() => {
        wsManager.sendToUser('non-existent-user', {
          type: 'test',
          data: { message: 'test' },
          timestamp: new Date().toISOString()
        });
      }).not.toThrow();
    });

    test('should handle sendToUsers for empty array', () => {
      expect(() => {
        wsManager.sendToUsers([], {
          type: 'test',
          data: { message: 'test' },
          timestamp: new Date().toISOString()
        });
      }).not.toThrow();
    });

    test('should handle broadcast with no connections', () => {
      expect(() => {
        wsManager.broadcast({
          type: 'test',
          data: { message: 'test' },
          timestamp: new Date().toISOString()
        });
      }).not.toThrow();
    });
  });

  describe('Connection Cleanup', () => {
    test('should handle closeConnection for non-existent connection', () => {
      expect(() => {
        wsManager.closeConnection('non-existent-connection');
      }).not.toThrow();
    });

    test('should cleanup resources properly', () => {
      expect(() => {
        wsManager.cleanup();
      }).not.toThrow();
    });
  });
});