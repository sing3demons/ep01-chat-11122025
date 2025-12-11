// WebSocket service tests
import WebSocketService from '../websocket.service';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(public url: string) {
    // Simulate connection opening
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  send(data: string) {
    if (this.readyState === MockWebSocket.OPEN) {
      // Echo back for testing
      setTimeout(() => {
        if (this.onmessage) {
          this.onmessage(new MessageEvent('message', { data }));
        }
      }, 5);
    }
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code: code || 1000, reason: reason || '' }));
    }
  }
}

// Replace global WebSocket with mock
(global as any).WebSocket = MockWebSocket;

describe('WebSocketService', () => {
  let service: WebSocketService;

  beforeEach(() => {
    service = new WebSocketService('ws://localhost:3001');
  });

  afterEach(() => {
    service.disconnect();
  });

  test('should connect to WebSocket server', async () => {
    const connectionPromise = service.connect();
    await expect(connectionPromise).resolves.toBeUndefined();
    expect(service.isConnected()).toBe(true);
  });

  test('should send messages when connected', async () => {
    await service.connect();
    
    const result = service.sendMessage('Hello', 'room1', 'user1');
    expect(result).toBe(true);
  });

  test('should queue messages when disconnected', () => {
    const result = service.sendMessage('Hello', 'room1', 'user1');
    expect(result).toBe(true); // Now returns true because message is queued
    
    // Verify message was queued
    const queueStats = service.getOfflineQueueStats();
    expect(queueStats.total).toBe(1);
    expect(queueStats.queued).toBe(1);
  });

  test('should handle typing indicators', async () => {
    await service.connect();
    
    const result = service.sendTyping('room1', 'user1', true);
    expect(result).toBe(true);
  });

  test('should handle message status updates', async () => {
    await service.connect();
    
    const result = service.sendMessageStatus('msg1', 'delivered');
    expect(result).toBe(true);
  });

  test('should track connection status', () => {
    const status = service.getConnectionStatus();
    expect(status.isConnected).toBe(false);
    expect(status.reconnectAttempts).toBe(0);
  });

  test('should disconnect cleanly', async () => {
    await service.connect();
    expect(service.isConnected()).toBe(true);
    
    service.disconnect();
    expect(service.isConnected()).toBe(false);
  });
});