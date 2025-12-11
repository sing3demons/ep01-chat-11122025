import { WebSocketService } from './websocket.service';
import { MessageService } from '../message/message.service';
import { UserService } from '../user/user.service';
import { OfflineRepository, IOfflineRepository } from './offline.repository';
import { ApiResponse } from '../types';
import { ValidationUtils } from '../utils/validation';

export interface QueuedMessage {
  id: string;
  userId: string;
  messageData: any;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: Date;
}

export interface DeviceSession {
  userId: string;
  deviceId: string;
  lastSyncAt: Date;
  isActive: boolean;
  connectionId?: string;
}

/**
 * Offline Support Service
 * Handles message queuing, automatic reconnection, and cross-device synchronization
 */
export class OfflineService {
  private static instance: OfflineService;
  private messageQueue: Map<string, QueuedMessage[]> = new Map(); // userId -> messages
  private deviceSessions: Map<string, DeviceSession[]> = new Map(); // userId -> devices
  private retryInterval: NodeJS.Timeout | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  
  private readonly RETRY_INTERVAL = 30000; // 30 seconds
  private readonly SYNC_INTERVAL = 60000; // 1 minute
  private readonly MAX_RETRIES = 5;
  private readonly RETRY_BACKOFF_MULTIPLIER = 2;

  private constructor(
    private readonly offlineRepository: IOfflineRepository,
    private readonly messageService: MessageService,
    private readonly userService: UserService
  ) {
    this.loadFromDatabase();
    this.startRetryProcessor();
    this.startSyncProcessor();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(
    offlineRepository?: IOfflineRepository,
    messageService?: MessageService,
    userService?: UserService
  ): OfflineService {
    if (!OfflineService.instance) {
      if (!offlineRepository || !messageService || !userService) {
        throw new Error('Dependencies required for first initialization');
      }
      OfflineService.instance = new OfflineService(offlineRepository, messageService, userService);
    }
    return OfflineService.instance;
  }

  /**
   * Queue message for offline user
   */
  public async queueMessage(userId: string, messageData: any): Promise<ApiResponse> {
    try {
      // Validate inputs
      if (!ValidationUtils.isValidUUID(userId)) {
        return {
          success: false,
          error: 'Invalid user ID format'
        };
      }

      if (!messageData) {
        return {
          success: false,
          error: 'Invalid message data'
        };
      }

      // Store in database
      const queuedMessage = await this.offlineRepository.createQueuedMessage({
        userId,
        messageData: JSON.stringify(messageData),
        retryCount: 0,
        maxRetries: this.MAX_RETRIES,
        nextRetryAt: new Date()
      });

      // Also keep in memory for immediate processing
      const memoryMessage: QueuedMessage = {
        id: queuedMessage.id,
        userId,
        messageData,
        timestamp: queuedMessage.createdAt,
        retryCount: queuedMessage.retryCount,
        maxRetries: queuedMessage.maxRetries,
        nextRetryAt: queuedMessage.nextRetryAt
      };

      if (!this.messageQueue.has(userId)) {
        this.messageQueue.set(userId, []);
      }
      this.messageQueue.get(userId)!.push(memoryMessage);

      console.log(`Message queued for offline user ${userId}:`, queuedMessage.id);

      return {
        success: true,
        data: { queuedMessageId: queuedMessage.id },
        message: 'Message queued for delivery when user comes online'
      };

    } catch (error) {
      console.error('Queue message error:', error);
      return {
        success: false,
        error: 'Failed to queue message'
      };
    }
  }

  /**
   * Process queued messages when user comes online
   */
  public async processQueuedMessages(userId: string): Promise<ApiResponse> {
    try {
      // Validate user ID
      if (!ValidationUtils.isValidUUID(userId)) {
        return {
          success: false,
          error: 'Invalid user ID format'
        };
      }

      const userQueue = this.messageQueue.get(userId);
      if (!userQueue || userQueue.length === 0) {
        return {
          success: true,
          data: { processedCount: 0 },
          message: 'No queued messages to process'
        };
      }

      let processedCount = 0;
      let failedCount = 0;
      const wsService = WebSocketService.getInstance();

      // Process each queued message
      for (let i = userQueue.length - 1; i >= 0; i--) {
        const queuedMessage = userQueue[i];
        
        try {
          // Send the queued message
          const result = await this.messageService.sendMessage(queuedMessage.messageData);
          
          if (result.success) {
            // Send real-time notification to user
            await wsService.sendMessageNotification(userId, {
              type: 'queued_message_delivered',
              message: result.data,
              queuedMessageId: queuedMessage.id
            });

            // Remove from queue
            userQueue.splice(i, 1);
            processedCount++;
            
            console.log(`Queued message ${queuedMessage.id} delivered to user ${userId}`);
          } else {
            // Increment retry count
            queuedMessage.retryCount++;
            queuedMessage.nextRetryAt = new Date(
              Date.now() + (this.RETRY_INTERVAL * Math.pow(this.RETRY_BACKOFF_MULTIPLIER, queuedMessage.retryCount))
            );

            if (queuedMessage.retryCount >= queuedMessage.maxRetries) {
              // Remove failed message after max retries
              userQueue.splice(i, 1);
              failedCount++;
              
              console.error(`Queued message ${queuedMessage.id} failed after ${queuedMessage.maxRetries} retries`);
              
              // Notify user about failed message
              await wsService.sendMessageNotification(userId, {
                type: 'queued_message_failed',
                queuedMessageId: queuedMessage.id,
                error: result.error
              });
            }
          }
        } catch (error) {
          console.error(`Error processing queued message ${queuedMessage.id}:`, error);
          failedCount++;
        }
      }

      // Clean up empty queue
      if (userQueue.length === 0) {
        this.messageQueue.delete(userId);
      }

      return {
        success: true,
        data: { processedCount, failedCount },
        message: `Processed ${processedCount} queued messages, ${failedCount} failed`
      };

    } catch (error) {
      console.error('Process queued messages error:', error);
      return {
        success: false,
        error: 'Failed to process queued messages'
      };
    }
  }

  /**
   * Register device session for cross-device sync
   */
  public async registerDeviceSession(
    userId: string, 
    deviceId: string, 
    connectionId?: string
  ): Promise<ApiResponse> {
    try {
      // Validate inputs
      if (!ValidationUtils.isValidUUID(userId)) {
        return {
          success: false,
          error: 'Invalid user ID format'
        };
      }

      if (!deviceId || deviceId.trim().length === 0) {
        return {
          success: false,
          error: 'Device ID is required'
        };
      }

      // Store in database
      const deviceSession = await this.offlineRepository.upsertDeviceSession({
        userId,
        deviceId,
        connectionId,
        isActive: true,
        lastSyncAt: new Date()
      });

      // Update memory cache
      if (!this.deviceSessions.has(userId)) {
        this.deviceSessions.set(userId, []);
      }

      const userSessions = this.deviceSessions.get(userId)!;
      let existingSession = userSessions.find(session => session.deviceId === deviceId);
      
      if (existingSession) {
        existingSession.lastSyncAt = new Date();
        existingSession.isActive = true;
        existingSession.connectionId = connectionId;
      } else {
        const newSession: DeviceSession = {
          userId,
          deviceId,
          lastSyncAt: new Date(),
          isActive: true,
          connectionId
        };
        userSessions.push(newSession);
      }

      console.log(`Device session registered for user ${userId}, device ${deviceId}`);

      return {
        success: true,
        message: 'Device session registered successfully'
      };

    } catch (error) {
      console.error('Register device session error:', error);
      return {
        success: false,
        error: 'Failed to register device session'
      };
    }
  }

  /**
   * Unregister device session
   */
  public async unregisterDeviceSession(userId: string, deviceId: string): Promise<ApiResponse> {
    try {
      // Validate inputs
      if (!ValidationUtils.isValidUUID(userId)) {
        return {
          success: false,
          error: 'Invalid user ID format'
        };
      }

      const userSessions = this.deviceSessions.get(userId);
      if (!userSessions) {
        return {
          success: true,
          message: 'No device sessions found for user'
        };
      }

      // Find and deactivate session
      const sessionIndex = userSessions.findIndex(session => session.deviceId === deviceId);
      if (sessionIndex !== -1) {
        userSessions[sessionIndex].isActive = false;
        userSessions[sessionIndex].connectionId = undefined;
        
        console.log(`Device session unregistered for user ${userId}, device ${deviceId}`);
      }

      return {
        success: true,
        message: 'Device session unregistered successfully'
      };

    } catch (error) {
      console.error('Unregister device session error:', error);
      return {
        success: false,
        error: 'Failed to unregister device session'
      };
    }
  }

  /**
   * Synchronize data across user's devices
   */
  public async synchronizeUserDevices(userId: string): Promise<ApiResponse> {
    try {
      // Validate user ID
      if (!ValidationUtils.isValidUUID(userId)) {
        return {
          success: false,
          error: 'Invalid user ID format'
        };
      }

      const userSessions = this.deviceSessions.get(userId);
      if (!userSessions || userSessions.length === 0) {
        return {
          success: true,
          data: { syncedDevices: 0 },
          message: 'No active device sessions to sync'
        };
      }

      const wsService = WebSocketService.getInstance();
      let syncedDevices = 0;

      // Get user's recent data for synchronization
      const recentMessages = await this.messageService.getRecentMessagesForChatList(userId);
      const unreadCounts = await this.messageService.getUnreadMessageCount(userId);

      const syncData = {
        type: 'device_sync',
        data: {
          timestamp: new Date().toISOString(),
          recentMessages: recentMessages.success ? recentMessages.data : null,
          unreadCounts: unreadCounts.success ? unreadCounts.data : null,
          userId: userId
        }
      };

      // Send sync data to all active devices
      for (const session of userSessions) {
        if (session.isActive && session.connectionId) {
          try {
            // Use WebSocketService to send notification instead
            await wsService.sendNotification(userId, syncData);
            session.lastSyncAt = new Date();
            syncedDevices++;
            
            console.log(`Synced data to device ${session.deviceId} for user ${userId}`);
          } catch (error) {
            console.error(`Failed to sync device ${session.deviceId}:`, error);
          }
        }
      }

      return {
        success: true,
        data: { syncedDevices },
        message: `Synchronized data across ${syncedDevices} devices`
      };

    } catch (error) {
      console.error('Synchronize user devices error:', error);
      return {
        success: false,
        error: 'Failed to synchronize user devices'
      };
    }
  }

  /**
   * Handle automatic reconnection for a user
   */
  public async handleReconnection(userId: string, deviceId?: string): Promise<ApiResponse> {
    try {
      // Validate user ID
      if (!ValidationUtils.isValidUUID(userId)) {
        return {
          success: false,
          error: 'Invalid user ID format'
        };
      }

      console.log(`Handling reconnection for user ${userId}, device ${deviceId || 'unknown'}`);

      // Update user online status
      await this.userService.updateOnlineStatus(userId, true);

      // Process any queued messages
      const queueResult = await this.processQueuedMessages(userId);

      // Mark messages as delivered
      await this.messageService.markMessagesAsDelivered(userId);

      // Synchronize devices if device ID provided
      let syncResult = null;
      if (deviceId) {
        await this.registerDeviceSession(userId, deviceId);
        syncResult = await this.synchronizeUserDevices(userId);
      }

      // Send reconnection confirmation
      const wsService = WebSocketService.getInstance();
      await wsService.sendNotification(userId, {
        type: 'reconnection_complete',
        data: {
          timestamp: new Date().toISOString(),
          queuedMessages: queueResult.data,
          syncedDevices: syncResult?.data?.syncedDevices || 0
        }
      });

      return {
        success: true,
        data: {
          queuedMessages: queueResult.data,
          syncedDevices: syncResult?.data?.syncedDevices || 0
        },
        message: 'Reconnection handled successfully'
      };

    } catch (error) {
      console.error('Handle reconnection error:', error);
      return {
        success: false,
        error: 'Failed to handle reconnection'
      };
    }
  }

  /**
   * Retry failed message delivery
   */
  public async retryMessageDelivery(queuedMessageId: string): Promise<ApiResponse> {
    try {
      // Find the queued message
      let foundMessage: QueuedMessage | null = null;
      let userId: string | null = null;

      for (const [uid, messages] of this.messageQueue) {
        const message = messages.find(m => m.id === queuedMessageId);
        if (message) {
          foundMessage = message;
          userId = uid;
          break;
        }
      }

      if (!foundMessage || !userId) {
        return {
          success: false,
          error: 'Queued message not found'
        };
      }

      // Check if user is now online
      const wsService = WebSocketService.getInstance();
      if (!wsService.isUserOnline(userId)) {
        return {
          success: false,
          error: 'User is still offline'
        };
      }

      // Attempt to send the message
      const result = await this.messageService.sendMessage(foundMessage.messageData);

      if (result.success) {
        // Remove from queue
        const userQueue = this.messageQueue.get(userId)!;
        const messageIndex = userQueue.findIndex(m => m.id === queuedMessageId);
        if (messageIndex !== -1) {
          userQueue.splice(messageIndex, 1);
        }

        // Notify user
        await wsService.sendMessageNotification(userId, {
          type: 'queued_message_delivered',
          message: result.data,
          queuedMessageId
        });

        return {
          success: true,
          data: result.data,
          message: 'Message delivered successfully'
        };
      } else {
        // Update retry info
        foundMessage.retryCount++;
        foundMessage.nextRetryAt = new Date(
          Date.now() + (this.RETRY_INTERVAL * Math.pow(this.RETRY_BACKOFF_MULTIPLIER, foundMessage.retryCount))
        );

        return {
          success: false,
          error: result.error || 'Message delivery failed',
          data: { retryCount: foundMessage.retryCount }
        };
      }

    } catch (error) {
      console.error('Retry message delivery error:', error);
      return {
        success: false,
        error: 'Failed to retry message delivery'
      };
    }
  }

  /**
   * Get queued messages for a user
   */
  public getQueuedMessages(userId: string): QueuedMessage[] {
    return this.messageQueue.get(userId) || [];
  }

  /**
   * Get device sessions for a user
   */
  public getDeviceSessions(userId: string): DeviceSession[] {
    return this.deviceSessions.get(userId) || [];
  }

  /**
   * Get offline support statistics
   */
  public getOfflineStats(): {
    totalQueuedMessages: number;
    totalDeviceSessions: number;
    activeDeviceSessions: number;
    usersWithQueuedMessages: number;
  } {
    let totalQueuedMessages = 0;
    let totalDeviceSessions = 0;
    let activeDeviceSessions = 0;

    // Count queued messages
    for (const messages of this.messageQueue.values()) {
      totalQueuedMessages += messages.length;
    }

    // Count device sessions
    for (const sessions of this.deviceSessions.values()) {
      totalDeviceSessions += sessions.length;
      activeDeviceSessions += sessions.filter(s => s.isActive).length;
    }

    return {
      totalQueuedMessages,
      totalDeviceSessions,
      activeDeviceSessions,
      usersWithQueuedMessages: this.messageQueue.size
    };
  }

  /**
   * Start retry processor for failed messages
   */
  private startRetryProcessor(): void {
    this.retryInterval = setInterval(() => {
      this.processRetries();
    }, this.RETRY_INTERVAL);
  }

  /**
   * Start sync processor for cross-device synchronization
   */
  private startSyncProcessor(): void {
    this.syncInterval = setInterval(() => {
      this.processSynchronization();
    }, this.SYNC_INTERVAL);
  }

  /**
   * Process message retries
   */
  private async processRetries(): Promise<void> {
    const now = new Date();
    const wsService = WebSocketService.getInstance();

    for (const [userId, messages] of this.messageQueue) {
      // Check if user is online
      if (!wsService.isUserOnline(userId)) {
        continue;
      }

      // Process messages ready for retry
      for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i];
        
        if (message.nextRetryAt <= now) {
          try {
            const result = await this.messageService.sendMessage(message.messageData);
            
            if (result.success) {
              // Remove from queue and notify user
              messages.splice(i, 1);
              
              await wsService.sendMessageNotification(userId, {
                type: 'queued_message_delivered',
                message: result.data,
                queuedMessageId: message.id
              });
              
              console.log(`Retry successful for message ${message.id}`);
            } else {
              // Update retry info
              message.retryCount++;
              message.nextRetryAt = new Date(
                Date.now() + (this.RETRY_INTERVAL * Math.pow(this.RETRY_BACKOFF_MULTIPLIER, message.retryCount))
              );

              if (message.retryCount >= message.maxRetries) {
                // Remove after max retries
                messages.splice(i, 1);
                
                await wsService.sendMessageNotification(userId, {
                  type: 'queued_message_failed',
                  queuedMessageId: message.id,
                  error: result.error
                });
                
                console.error(`Message ${message.id} failed after ${message.maxRetries} retries`);
              }
            }
          } catch (error) {
            console.error(`Error retrying message ${message.id}:`, error);
          }
        }
      }

      // Clean up empty queue
      if (messages.length === 0) {
        this.messageQueue.delete(userId);
      }
    }
  }

  /**
   * Process cross-device synchronization
   */
  private async processSynchronization(): Promise<void> {
    const wsService = WebSocketService.getInstance();

    for (const [userId, sessions] of this.deviceSessions) {
      // Only sync if user has multiple active devices
      const activeSessions = sessions.filter(s => s.isActive);
      if (activeSessions.length <= 1) {
        continue;
      }

      // Check if user is online
      if (!wsService.isUserOnline(userId)) {
        continue;
      }

      try {
        await this.synchronizeUserDevices(userId);
      } catch (error) {
        console.error(`Error syncing devices for user ${userId}:`, error);
      }
    }
  }

  /**
   * Load data from database on startup
   */
  private async loadFromDatabase(): Promise<void> {
    try {
      // Load queued messages
      const queuedMessages = await this.offlineRepository.getQueuedMessagesForRetry();
      for (const dbMessage of queuedMessages) {
        const memoryMessage: QueuedMessage = {
          id: dbMessage.id,
          userId: dbMessage.userId,
          messageData: JSON.parse(dbMessage.messageData),
          timestamp: dbMessage.createdAt,
          retryCount: dbMessage.retryCount,
          maxRetries: dbMessage.maxRetries,
          nextRetryAt: dbMessage.nextRetryAt
        };

        if (!this.messageQueue.has(dbMessage.userId)) {
          this.messageQueue.set(dbMessage.userId, []);
        }
        this.messageQueue.get(dbMessage.userId)!.push(memoryMessage);
      }

      // Load active device sessions
      const allSessions = await this.offlineRepository.getOfflineStats();
      console.log(`Loaded ${queuedMessages.length} queued messages and ${allSessions.activeDeviceSessions} active device sessions from database`);

    } catch (error) {
      console.error('Error loading offline data from database:', error);
    }
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
    }

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    this.messageQueue.clear();
    this.deviceSessions.clear();
  }
}