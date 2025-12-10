import { WebSocketService } from '../websocket.service';
import { WebSocketManager } from '../websocket.manager';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

describe('WebSocketService', () => {
  let server: any;
  let wss: WebSocketServer;
  let wsManager: WebSocketManager;
  let wsService: WebSocketService;

  beforeAll(() => {
    server = createServer();
    wss = new WebSocketServer({ server });
    wsManager = new WebSocketManager(wss);
    wsService = WebSocketService.getInstance();
    wsService.initialize(wsManager);
  });

  afterAll(() => {
    wsService.cleanup();
    wss.close();
    server.close();
  });

  describe('Singleton Pattern', () => {
    test('should return same instance', () => {
      const instance1 = WebSocketService.getInstance();
      const instance2 = WebSocketService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Connection Statistics', () => {
    test('should return connection stats', () => {
      const stats = wsService.getConnectionStats();
      expect(stats).toHaveProperty('totalConnections');
      expect(stats).toHaveProperty('activeConnections');
      expect(stats).toHaveProperty('authenticatedConnections');
      expect(stats).toHaveProperty('uniqueUsers');
      expect(typeof stats.totalConnections).toBe('number');
    });

    test('should return online users count', () => {
      const count = wsService.getOnlineUsersCount();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('User Status', () => {
    test('should check if user is online', () => {
      const isOnline = wsService.isUserOnline('test-user-id');
      expect(typeof isOnline).toBe('boolean');
    });
  });

  describe('Message Sending', () => {
    test('should handle sendMessageNotification gracefully', async () => {
      await expect(wsService.sendMessageNotification('user-id', {
        id: 'msg-1',
        content: 'test message',
        senderId: 'sender-id'
      })).resolves.not.toThrow();
    });

    test('should handle sendNotification gracefully', async () => {
      await expect(wsService.sendNotification('user-id', {
        type: 'test',
        message: 'test notification'
      })).resolves.not.toThrow();
    });

    test('should handle broadcastSystemAnnouncement gracefully', async () => {
      await expect(wsService.broadcastSystemAnnouncement('System maintenance in 5 minutes')).resolves.not.toThrow();
    });
  });

  describe('Status Updates', () => {
    test('should handle sendUserStatusChange gracefully', async () => {
      await expect(wsService.sendUserStatusChange('user-id', true)).resolves.not.toThrow();
    });

    test('should handle sendConnectionStatus gracefully', async () => {
      await expect(wsService.sendConnectionStatus('user-id', 'connected')).resolves.not.toThrow();
    });

    test('should handle sendMessageStatusUpdate gracefully', async () => {
      await expect(wsService.sendMessageStatusUpdate('user-id', 'msg-1', 'delivered')).resolves.not.toThrow();
    });
  });

  describe('User Management', () => {
    test('should handle disconnectUser gracefully', async () => {
      await expect(wsService.disconnectUser('user-id', 'Test disconnect')).resolves.not.toThrow();
    });

    test('should handle handleUserLogout gracefully', async () => {
      await expect(wsService.handleUserLogout('user-id')).resolves.not.toThrow();
    });
  });

  describe('Cleanup', () => {
    test('should cleanup without errors', () => {
      expect(() => {
        wsService.cleanup();
      }).not.toThrow();
    });
  });
});