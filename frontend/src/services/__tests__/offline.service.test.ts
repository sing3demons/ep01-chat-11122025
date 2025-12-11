// Tests for offline message queue service
import { offlineService } from '../offline.service';

describe('OfflineService', () => {
  beforeEach(() => {
    // Clear queue before each test
    offlineService.clearQueue();
    localStorage.clear();
  });

  test('should queue messages when offline', () => {
    const queuedMessage = offlineService.queueMessage('Hello', 'room1', 'user1');
    
    expect(queuedMessage.content).toBe('Hello');
    expect(queuedMessage.chatRoomId).toBe('room1');
    expect(queuedMessage.senderId).toBe('user1');
    expect(queuedMessage.status).toBe('queued');
    expect(queuedMessage.retryCount).toBe(0);
  });

  test('should get queued messages', () => {
    offlineService.queueMessage('Hello 1', 'room1', 'user1');
    offlineService.queueMessage('Hello 2', 'room1', 'user1');
    
    const queuedMessages = offlineService.getQueuedMessages();
    expect(queuedMessages).toHaveLength(2);
    expect(queuedMessages[0].content).toBe('Hello 1');
    expect(queuedMessages[1].content).toBe('Hello 2');
  });

  test('should get queued messages for specific chat room', () => {
    offlineService.queueMessage('Hello room1', 'room1', 'user1');
    offlineService.queueMessage('Hello room2', 'room2', 'user1');
    
    const room1Messages = offlineService.getQueuedMessagesForChat('room1');
    expect(room1Messages).toHaveLength(1);
    expect(room1Messages[0].content).toBe('Hello room1');
  });

  test('should remove messages from queue', () => {
    const queuedMessage = offlineService.queueMessage('Hello', 'room1', 'user1');
    
    expect(offlineService.getQueuedMessages()).toHaveLength(1);
    
    const removed = offlineService.removeFromQueue(queuedMessage.id);
    expect(removed).toBe(true);
    expect(offlineService.getQueuedMessages()).toHaveLength(0);
  });

  test('should get queue statistics', () => {
    offlineService.queueMessage('Hello 1', 'room1', 'user1');
    offlineService.queueMessage('Hello 2', 'room1', 'user1');
    
    const stats = offlineService.getQueueStats();
    expect(stats.total).toBe(2);
    expect(stats.queued).toBe(2);
    expect(stats.sending).toBe(0);
    expect(stats.failed).toBe(0);
  });

  test('should process queue successfully', async () => {
    const mockSendFunction = jest.fn().mockReturnValue(true);
    const onMessageSent = jest.fn();
    
    offlineService.setHandlers({
      onMessageSent
    });
    
    offlineService.queueMessage('Hello', 'room1', 'user1');
    
    await offlineService.processQueue(mockSendFunction);
    
    expect(mockSendFunction).toHaveBeenCalledWith('Hello', 'room1', 'user1');
    expect(onMessageSent).toHaveBeenCalled();
    expect(offlineService.getQueuedMessages()).toHaveLength(0);
  });

  test('should handle failed messages with retry', async () => {
    const mockSendFunction = jest.fn().mockReturnValue(false);
    const onMessageFailed = jest.fn();
    
    offlineService.setHandlers({
      onMessageFailed
    });
    
    const queuedMessage = offlineService.queueMessage('Hello', 'room1', 'user1');
    
    // Process queue multiple times to exceed retry limit
    await offlineService.processQueue(mockSendFunction);
    await offlineService.processQueue(mockSendFunction);
    await offlineService.processQueue(mockSendFunction);
    
    const messages = offlineService.getQueuedMessages();
    expect(messages[0].status).toBe('failed');
    expect(messages[0].retryCount).toBe(3);
    expect(onMessageFailed).toHaveBeenCalled();
  });

  test('should save and load queue from localStorage', () => {
    offlineService.queueMessage('Hello', 'room1', 'user1');
    
    // Create new service instance to test loading
    const newService = new (offlineService.constructor as any)();
    newService.loadQueueFromStorage();
    
    const loadedMessages = newService.getQueuedMessages();
    expect(loadedMessages).toHaveLength(1);
    expect(loadedMessages[0].content).toBe('Hello');
  });

  test('should clear failed messages', () => {
    const message1 = offlineService.queueMessage('Hello 1', 'room1', 'user1');
    const message2 = offlineService.queueMessage('Hello 2', 'room1', 'user1');
    
    // Manually set one message as failed
    const messages = offlineService.getQueuedMessages();
    messages[0].status = 'failed';
    
    offlineService.clearFailedMessages();
    
    const remainingMessages = offlineService.getQueuedMessages();
    expect(remainingMessages).toHaveLength(1);
    expect(remainingMessages[0].content).toBe('Hello 2');
  });
});