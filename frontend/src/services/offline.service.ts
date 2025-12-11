// Offline message queue service for handling messages when disconnected
import type { Message } from '../types/index';

export interface QueuedMessage {
  id: string;
  content: string;
  chatRoomId: string;
  senderId: string;
  timestamp: Date;
  retryCount: number;
  status: 'queued' | 'sending' | 'failed';
}

export interface OfflineServiceEventHandlers {
  onMessageQueued: (message: QueuedMessage) => void;
  onMessageSent: (messageId: string) => void;
  onMessageFailed: (messageId: string, error: string) => void;
  onQueueProcessed: () => void;
}

class OfflineService {
  private messageQueue: QueuedMessage[] = [];
  private handlers: Partial<OfflineServiceEventHandlers> = {};
  private maxRetries = 3;
  private retryDelay = 2000;
  private isProcessing = false;

  // Set event handlers
  setHandlers(handlers: Partial<OfflineServiceEventHandlers>) {
    this.handlers = { ...this.handlers, ...handlers };
  }

  // Queue a message for offline sending
  queueMessage(content: string, chatRoomId: string, senderId: string): QueuedMessage {
    const queuedMessage: QueuedMessage = {
      id: this.generateId(),
      content,
      chatRoomId,
      senderId,
      timestamp: new Date(),
      retryCount: 0,
      status: 'queued'
    };

    this.messageQueue.push(queuedMessage);
    this.saveQueueToStorage();
    
    if (this.handlers.onMessageQueued) {
      this.handlers.onMessageQueued(queuedMessage);
    }

    return queuedMessage;
  }

  // Process queued messages when connection is restored
  async processQueue(sendFunction: (content: string, chatRoomId: string, senderId: string) => boolean): Promise<void> {
    if (this.isProcessing || this.messageQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const messagesToProcess = [...this.messageQueue];

    for (const message of messagesToProcess) {
      if (message.status === 'failed' && message.retryCount >= this.maxRetries) {
        continue; // Skip messages that have exceeded retry limit
      }

      try {
        message.status = 'sending';
        message.retryCount++;
        
        const success = sendFunction(message.content, message.chatRoomId, message.senderId);
        
        if (success) {
          // Remove from queue on successful send
          this.removeFromQueue(message.id);
          
          if (this.handlers.onMessageSent) {
            this.handlers.onMessageSent(message.id);
          }
        } else {
          throw new Error('Failed to send message');
        }
      } catch (error) {
        message.status = 'failed';
        
        if (message.retryCount >= this.maxRetries) {
          if (this.handlers.onMessageFailed) {
            this.handlers.onMessageFailed(message.id, 'Maximum retry attempts exceeded');
          }
        } else {
          // Schedule retry
          setTimeout(() => {
            if (this.messageQueue.find(m => m.id === message.id)) {
              message.status = 'queued';
            }
          }, this.retryDelay * message.retryCount);
        }
      }
    }

    this.isProcessing = false;
    this.saveQueueToStorage();
    
    if (this.handlers.onQueueProcessed) {
      this.handlers.onQueueProcessed();
    }
  }

  // Get all queued messages
  getQueuedMessages(): QueuedMessage[] {
    return [...this.messageQueue];
  }

  // Get queued messages for a specific chat room
  getQueuedMessagesForChat(chatRoomId: string): QueuedMessage[] {
    return this.messageQueue.filter(msg => msg.chatRoomId === chatRoomId);
  }

  // Remove a message from the queue
  removeFromQueue(messageId: string): boolean {
    const index = this.messageQueue.findIndex(msg => msg.id === messageId);
    if (index !== -1) {
      this.messageQueue.splice(index, 1);
      this.saveQueueToStorage();
      return true;
    }
    return false;
  }

  // Clear all queued messages
  clearQueue(): void {
    this.messageQueue = [];
    this.saveQueueToStorage();
  }

  // Clear failed messages
  clearFailedMessages(): void {
    this.messageQueue = this.messageQueue.filter(msg => msg.status !== 'failed');
    this.saveQueueToStorage();
  }

  // Get queue statistics
  getQueueStats() {
    const total = this.messageQueue.length;
    const queued = this.messageQueue.filter(m => m.status === 'queued').length;
    const sending = this.messageQueue.filter(m => m.status === 'sending').length;
    const failed = this.messageQueue.filter(m => m.status === 'failed').length;

    return { total, queued, sending, failed };
  }

  // Load queue from localStorage on initialization
  loadQueueFromStorage(): void {
    try {
      const stored = localStorage.getItem('offline_message_queue');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.messageQueue = parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      }
    } catch (error) {
      console.error('Failed to load message queue from storage:', error);
      this.messageQueue = [];
    }
  }

  // Save queue to localStorage
  private saveQueueToStorage(): void {
    try {
      localStorage.setItem('offline_message_queue', JSON.stringify(this.messageQueue));
    } catch (error) {
      console.error('Failed to save message queue to storage:', error);
    }
  }

  // Generate unique ID for queued messages
  private generateId(): string {
    return `queued_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const offlineService = new OfflineService();
export default OfflineService;