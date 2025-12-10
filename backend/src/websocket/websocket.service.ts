import { WebSocketManager, WebSocketMessage } from './websocket.manager';
import { UserService } from '../user/user.service';

/**
 * WebSocket Service
 * High-level service for WebSocket operations and integration with other services
 */
export class WebSocketService {
  private static instance: WebSocketService;
  private wsManager: WebSocketManager | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  /**
   * Initialize WebSocket service with manager
   */
  public initialize(wsManager: WebSocketManager): void {
    this.wsManager = wsManager;
  }

  /**
   * Send real-time message notification
   */
  public async sendMessageNotification(recipientId: string, messageData: any): Promise<void> {
    if (!this.wsManager) return;

    const message: WebSocketMessage = {
      type: 'new_message',
      data: messageData,
      timestamp: new Date().toISOString()
    };

    this.wsManager.sendToUser(recipientId, message);
  }

  /**
   * Send typing indicator to chat room participants
   */
  public async sendTypingIndicator(chatRoomId: string, senderId: string, isTyping: boolean): Promise<void> {
    if (!this.wsManager) return;

    const message: WebSocketMessage = {
      type: isTyping ? 'user_typing_start' : 'user_typing_stop',
      data: {
        chatRoomId,
        userId: senderId,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };

    // Get chat room participants and send to all except sender
    try {
      // Import here to avoid circular dependency
      const { MessageRepository } = await import('../message/message.repository');
      const participants = await MessageRepository.getChatRoomParticipants(chatRoomId);
      
      for (const participant of participants) {
        if (participant.userId !== senderId) {
          this.wsManager.sendToUser(participant.userId, message);
        }
      }
    } catch (error) {
      console.error('Error sending typing indicator:', error);
    }
  }

  /**
   * Send message status update
   */
  public async sendMessageStatusUpdate(userId: string, messageId: string, status: 'delivered' | 'read'): Promise<void> {
    if (!this.wsManager) return;

    const message: WebSocketMessage = {
      type: 'message_status_update',
      data: {
        messageId,
        status,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };

    this.wsManager.sendToUser(userId, message);
  }

  /**
   * Send user status change notification
   */
  public async sendUserStatusChange(userId: string, isOnline: boolean, lastSeen?: Date): Promise<void> {
    if (!this.wsManager) return;

    // TODO: Get user's contacts and send status update
    // For now, this is a placeholder
    const message: WebSocketMessage = {
      type: 'user_status_change',
      data: {
        userId,
        isOnline,
        lastSeen: lastSeen?.toISOString(),
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };

    console.log(`User status change: ${userId} is now ${isOnline ? 'online' : 'offline'}`);
    // this.wsManager.sendToUsers(contactIds, message);
  }

  /**
   * Send group notification
   */
  public async sendGroupNotification(groupId: string, notification: any): Promise<void> {
    if (!this.wsManager) return;

    const message: WebSocketMessage = {
      type: 'group_notification',
      data: {
        groupId,
        ...notification,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };

    // Get group members and send notification
    try {
      // Import here to avoid circular dependency
      const { ChatRoomRepository } = await import('../chatroom/chatroom.repository');
      const participants = await ChatRoomRepository.getChatRoomParticipants(groupId);
      
      for (const participant of participants) {
        this.wsManager.sendToUser(participant.userId, message);
      }
    } catch (error) {
      console.error('Error sending group notification:', error);
    }
  }

  /**
   * Send real-time notification
   */
  public async sendNotification(userId: string, notification: any): Promise<void> {
    if (!this.wsManager) return;

    const message: WebSocketMessage = {
      type: 'notification',
      data: notification,
      timestamp: new Date().toISOString()
    };

    this.wsManager.sendToUser(userId, message);
  }

  /**
   * Send notification badge update
   */
  public async sendBadgeUpdate(userId: string, badgeData: any): Promise<void> {
    if (!this.wsManager) return;

    const message: WebSocketMessage = {
      type: 'badge_update',
      data: badgeData,
      timestamp: new Date().toISOString()
    };

    this.wsManager.sendToUser(userId, message);
  }

  /**
   * Send mention notification with high priority
   */
  public async sendMentionNotification(userId: string, mentionData: any): Promise<void> {
    if (!this.wsManager) return;

    const message: WebSocketMessage = {
      type: 'mention_notification',
      data: {
        ...mentionData,
        priority: 'high',
        requiresAttention: true
      },
      timestamp: new Date().toISOString()
    };

    this.wsManager.sendToUser(userId, message);
  }

  /**
   * Broadcast system announcement
   */
  public async broadcastSystemAnnouncement(announcement: string): Promise<void> {
    if (!this.wsManager) return;

    const message: WebSocketMessage = {
      type: 'system_announcement',
      data: {
        message: announcement,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };

    this.wsManager.broadcast(message);
  }

  /**
   * Get connection statistics
   */
  public getConnectionStats(): any {
    if (!this.wsManager) {
      return {
        totalConnections: 0,
        activeConnections: 0,
        authenticatedConnections: 0,
        uniqueUsers: 0
      };
    }

    return this.wsManager.getConnectionStats();
  }

  /**
   * Check if user is online
   */
  public isUserOnline(userId: string): boolean {
    if (!this.wsManager) return false;
    return this.wsManager.isUserOnline(userId);
  }

  /**
   * Get online users count
   */
  public getOnlineUsersCount(): number {
    if (!this.wsManager) return 0;
    return this.wsManager.getConnectionStats().uniqueUsers;
  }

  /**
   * Force disconnect user
   */
  public async disconnectUser(userId: string, reason: string = 'Admin disconnect'): Promise<void> {
    if (!this.wsManager) return;

    const connections = this.wsManager.getUserConnections(userId);
    connections.forEach(connection => {
      this.wsManager!.closeConnection(connection.id, 4002, reason);
    });

    // Update user offline status
    await UserService.updateOnlineStatus(userId, false);
  }

  /**
   * Send connection status update
   */
  public async sendConnectionStatus(userId: string, status: 'connected' | 'disconnected' | 'reconnecting'): Promise<void> {
    if (!this.wsManager) return;

    const message: WebSocketMessage = {
      type: 'connection_status',
      data: {
        status,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };

    this.wsManager.sendToUser(userId, message);
  }

  /**
   * Handle user logout (close all connections)
   */
  public async handleUserLogout(userId: string): Promise<void> {
    if (!this.wsManager) return;

    const connections = this.wsManager.getUserConnections(userId);
    connections.forEach(connection => {
      this.wsManager!.closeConnection(connection.id, 1000, 'User logged out');
    });

    await UserService.updateOnlineStatus(userId, false);
  }

  /**
   * Cleanup service
   */
  public cleanup(): void {
    if (this.wsManager) {
      this.wsManager.cleanup();
      this.wsManager = null;
    }
  }
}