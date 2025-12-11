// WebSocket service for managing real-time connections
import type { Message, TypingIndicator, User, ConnectionStatus, Notification } from '../types/index';
import { offlineService, QueuedMessage } from './offline.service';

export interface WebSocketEventHandlers {
  onMessage: (message: Message) => void;
  onTyping: (indicator: TypingIndicator) => void;
  onUserStatusUpdate: (user: User) => void;
  onMessageStatusUpdate: (messageId: string, status: 'delivered' | 'read') => void;
  onNotification: (notification: Notification) => void;
  onConnectionStatusChange: (status: ConnectionStatus) => void;
  onMessageQueued: (message: QueuedMessage) => void;
  onMessageRetry: (messageId: string, retryCount: number) => void;
  onMessageFailed: (messageId: string, error: string) => void;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string | null = null;
  private handlers: Partial<WebSocketEventHandlers> = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionStatus: ConnectionStatus = {
    isConnected: false,
    reconnectAttempts: 0
  };

  constructor(url: string = 'ws://localhost:3001') {
    this.url = url;
    
    // Initialize offline service
    offlineService.loadQueueFromStorage();
    offlineService.setHandlers({
      onMessageQueued: (message) => {
        if (this.handlers.onMessageQueued) {
          this.handlers.onMessageQueued(message);
        }
      },
      onMessageSent: (messageId) => {
        console.log('Queued message sent successfully:', messageId);
      },
      onMessageFailed: (messageId, error) => {
        if (this.handlers.onMessageFailed) {
          this.handlers.onMessageFailed(messageId, error);
        }
      },
      onQueueProcessed: () => {
        console.log('Message queue processed');
      }
    });
  }

  // Set authentication token
  setToken(token: string) {
    this.token = token;
  }

  // Set event handlers
  setHandlers(handlers: Partial<WebSocketEventHandlers>) {
    this.handlers = { ...this.handlers, ...handlers };
  }

  // Connect to WebSocket server
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = this.token ? `${this.url}?token=${this.token}` : this.url;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          this.connectionStatus = {
            isConnected: true,
            lastConnected: new Date(),
            reconnectAttempts: 0
          };
          
          this.startHeartbeat();
          this.notifyConnectionStatus();
          
          // Process queued messages when connection is restored
          this.processOfflineQueue();
          
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.connectionStatus.isConnected = false;
          this.stopHeartbeat();
          this.notifyConnectionStatus();

          // Attempt reconnection if not a clean close
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  // Disconnect from WebSocket server
  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.stopHeartbeat();
    this.connectionStatus.isConnected = false;
    this.notifyConnectionStatus();
  }

  // Send message through WebSocket
  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      return true;
    }
    console.warn('WebSocket not connected, message not sent:', message);
    return false;
  }

  // Send chat message
  sendMessage(content: string, chatRoomId: string, senderId: string) {
    if (this.isConnected()) {
      return this.send({
        type: 'message',
        payload: {
          content,
          chatRoomId,
          senderId,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      // Queue message for offline sending
      const queuedMessage = offlineService.queueMessage(content, chatRoomId, senderId);
      console.log('Message queued for offline sending:', queuedMessage.id);
      return true; // Return true to indicate message was handled (queued)
    }
  }

  // Send typing indicator
  sendTyping(chatRoomId: string, userId: string, isTyping: boolean) {
    return this.send({
      type: 'typing',
      payload: {
        chatRoomId,
        userId,
        isTyping
      }
    });
  }

  // Send message status update
  sendMessageStatus(messageId: string, status: 'delivered' | 'read') {
    return this.send({
      type: 'message_status',
      payload: {
        messageId,
        status
      }
    });
  }

  // Get current connection status
  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  // Check if connected
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // Handle incoming WebSocket messages
  private handleMessage(data: any) {
    switch (data.type) {
      case 'message':
        if (this.handlers.onMessage) {
          const message: Message = {
            ...data.payload,
            timestamp: new Date(data.payload.timestamp)
          };
          this.handlers.onMessage(message);
        }
        break;

      case 'typing':
        if (this.handlers.onTyping) {
          this.handlers.onTyping(data.payload);
        }
        break;

      case 'user_status':
        if (this.handlers.onUserStatusUpdate) {
          const user: User = {
            ...data.payload,
            lastSeen: new Date(data.payload.lastSeen)
          };
          this.handlers.onUserStatusUpdate(user);
        }
        break;

      case 'message_status':
        if (this.handlers.onMessageStatusUpdate) {
          this.handlers.onMessageStatusUpdate(
            data.payload.messageId,
            data.payload.status
          );
        }
        break;

      case 'notification':
        if (this.handlers.onNotification) {
          const notification: Notification = {
            ...data.payload,
            createdAt: new Date(data.payload.createdAt)
          };
          this.handlers.onNotification(notification);
        }
        break;

      case 'pong':
        // Heartbeat response - connection is alive
        break;

      default:
        console.log('Unknown message type:', data.type);
    }
  }

  // Schedule reconnection attempt
  private scheduleReconnect() {
    this.reconnectAttempts++;
    this.connectionStatus.reconnectAttempts = this.reconnectAttempts;
    this.notifyConnectionStatus();

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  // Start heartbeat to keep connection alive
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ type: 'ping' });
      }
    }, 30000); // Send ping every 30 seconds
  }

  // Stop heartbeat
  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Notify handlers about connection status changes
  private notifyConnectionStatus() {
    if (this.handlers.onConnectionStatusChange) {
      this.handlers.onConnectionStatusChange(this.connectionStatus);
    }
  }

  // Process offline message queue
  private async processOfflineQueue() {
    try {
      await offlineService.processQueue((content, chatRoomId, senderId) => {
        return this.send({
          type: 'message',
          payload: {
            content,
            chatRoomId,
            senderId,
            timestamp: new Date().toISOString()
          }
        });
      });
    } catch (error) {
      console.error('Error processing offline queue:', error);
    }
  }

  // Get offline queue statistics
  getOfflineQueueStats() {
    return offlineService.getQueueStats();
  }

  // Clear failed messages from queue
  clearFailedMessages() {
    offlineService.clearFailedMessages();
  }

  // Get queued messages for a specific chat
  getQueuedMessagesForChat(chatRoomId: string) {
    return offlineService.getQueuedMessagesForChat(chatRoomId);
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
export default WebSocketService;