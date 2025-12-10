import { NotificationRepository } from './notification.repository';
import { NotificationModel, CreateNotificationData, UpdateNotificationSettingsData, NotificationQuery } from './notification.model';
import { NotificationConverter } from './notification.converter';
import { ApiResponse } from '../types';
import { ValidationUtils } from '../utils/validation';
import { WebSocketService } from '../websocket/websocket.service';

/**
 * Notification Service
 * Handles business logic for notification operations
 */
export class NotificationService {
  /**
   * Create a new notification
   */
  static async createNotification(data: CreateNotificationData): Promise<ApiResponse> {
    try {
      // Validate notification data
      const validation = NotificationModel.validateCreateNotification(data);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        };
      }

      // Check if user exists
      const userExists = await NotificationRepository.verifyUserExists(validation.sanitizedData!.userId);
      if (!userExists) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Get user's notification settings
      const settings = await NotificationRepository.getNotificationSettings(validation.sanitizedData!.userId);

      // Check if notification should be sent based on settings
      if (settings) {
        const shouldSend = NotificationModel.shouldSendNotification(
          validation.sanitizedData!.type,
          settings,
          validation.sanitizedData!.content.includes('@') // Simple mention detection
        );

        if (!shouldSend) {
          return {
            success: true,
            message: 'Notification blocked by user settings'
          };
        }
      }

      // Create notification
      const notification = await NotificationRepository.createNotification(validation.sanitizedData!);

      // Convert to API format
      const apiNotification = NotificationConverter.toApiNotification(notification);

      // Send real-time notification via WebSocket
      const wsService = WebSocketService.getInstance();
      await wsService.sendNotification(validation.sanitizedData!.userId, apiNotification);

      return {
        success: true,
        data: apiNotification,
        message: 'Notification created successfully'
      };

    } catch (error) {
      console.error('Create notification error:', error);
      return {
        success: false,
        error: 'Failed to create notification'
      };
    }
  }

  /**
   * Get user notifications
   */
  static async getUserNotifications(query: NotificationQuery): Promise<ApiResponse> {
    try {
      // Validate query
      const validation = NotificationModel.validateNotificationQuery(query);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        };
      }

      // Get notifications
      const notifications = await NotificationRepository.getUserNotifications(validation.sanitizedData!);

      // Convert to API format
      const apiNotifications = notifications.map(notification => 
        NotificationConverter.toApiNotificationWithChatRoom(notification)
      );

      return {
        success: true,
        data: {
          notifications: apiNotifications,
          pagination: {
            limit: validation.sanitizedData!.limit || 20,
            offset: validation.sanitizedData!.offset || 0,
            hasMore: notifications.length === (validation.sanitizedData!.limit || 20)
          }
        }
      };

    } catch (error) {
      console.error('Get user notifications error:', error);
      return {
        success: false,
        error: 'Failed to get notifications'
      };
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string): Promise<ApiResponse> {
    try {
      // Validate notification ID
      if (!ValidationUtils.isValidUUID(notificationId)) {
        return {
          success: false,
          error: 'Invalid notification ID format'
        };
      }

      // Get notification
      const notification = await NotificationRepository.getNotificationById(notificationId);

      if (!notification) {
        return {
          success: false,
          error: 'Notification not found'
        };
      }

      // Check if user owns the notification
      if (notification.userId !== userId) {
        return {
          success: false,
          error: 'User is not authorized to update this notification'
        };
      }

      // Mark as read
      const updatedNotification = await NotificationRepository.updateNotification(notificationId, {
        isRead: true
      });

      // Convert to API format
      const apiNotification = NotificationConverter.toApiNotification(updatedNotification);

      return {
        success: true,
        data: apiNotification,
        message: 'Notification marked as read'
      };

    } catch (error) {
      console.error('Mark notification as read error:', error);
      return {
        success: false,
        error: 'Failed to mark notification as read'
      };
    }
  }

  /**
   * Mark all notifications as read for user
   */
  static async markAllAsRead(userId: string): Promise<ApiResponse> {
    try {
      // Validate user ID
      if (!ValidationUtils.isValidUUID(userId)) {
        return {
          success: false,
          error: 'Invalid user ID format'
        };
      }

      // Mark all unread notifications as read
      const updatedCount = await NotificationRepository.markAllAsRead(userId);

      return {
        success: true,
        data: { updatedCount },
        message: `${updatedCount} notifications marked as read`
      };

    } catch (error) {
      console.error('Mark all notifications as read error:', error);
      return {
        success: false,
        error: 'Failed to mark all notifications as read'
      };
    }
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId: string, userId: string): Promise<ApiResponse> {
    try {
      // Validate notification ID
      if (!ValidationUtils.isValidUUID(notificationId)) {
        return {
          success: false,
          error: 'Invalid notification ID format'
        };
      }

      // Get notification
      const notification = await NotificationRepository.getNotificationById(notificationId);

      if (!notification) {
        return {
          success: false,
          error: 'Notification not found'
        };
      }

      // Check if user owns the notification
      if (notification.userId !== userId) {
        return {
          success: false,
          error: 'User is not authorized to delete this notification'
        };
      }

      // Delete notification
      await NotificationRepository.deleteNotification(notificationId);

      return {
        success: true,
        message: 'Notification deleted successfully'
      };

    } catch (error) {
      console.error('Delete notification error:', error);
      return {
        success: false,
        error: 'Failed to delete notification'
      };
    }
  }

  /**
   * Get notification settings
   */
  static async getNotificationSettings(userId: string): Promise<ApiResponse> {
    try {
      // Validate user ID
      if (!ValidationUtils.isValidUUID(userId)) {
        return {
          success: false,
          error: 'Invalid user ID format'
        };
      }

      // Get notification settings
      const settings = await NotificationRepository.getNotificationSettings(userId);

      if (!settings) {
        return {
          success: false,
          error: 'Notification settings not found'
        };
      }

      // Convert to API format
      const apiSettings = NotificationConverter.toApiNotificationSettings(settings);

      return {
        success: true,
        data: apiSettings
      };

    } catch (error) {
      console.error('Get notification settings error:', error);
      return {
        success: false,
        error: 'Failed to get notification settings'
      };
    }
  }

  /**
   * Update notification settings
   */
  static async updateNotificationSettings(
    userId: string,
    updateData: UpdateNotificationSettingsData
  ): Promise<ApiResponse> {
    try {
      // Validate user ID
      if (!ValidationUtils.isValidUUID(userId)) {
        return {
          success: false,
          error: 'Invalid user ID format'
        };
      }

      // Validate update data
      const validation = NotificationModel.validateUpdateNotificationSettings(updateData);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        };
      }

      // Update notification settings
      const updatedSettings = await NotificationRepository.updateNotificationSettings(
        userId,
        validation.sanitizedData!
      );

      // Convert to API format
      const apiSettings = NotificationConverter.toApiNotificationSettings(updatedSettings);

      return {
        success: true,
        data: apiSettings,
        message: 'Notification settings updated successfully'
      };

    } catch (error) {
      console.error('Update notification settings error:', error);
      return {
        success: false,
        error: 'Failed to update notification settings'
      };
    }
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(userId: string): Promise<ApiResponse> {
    try {
      // Validate user ID
      if (!ValidationUtils.isValidUUID(userId)) {
        return {
          success: false,
          error: 'Invalid user ID format'
        };
      }

      // Get unread count
      const unreadCount = await NotificationRepository.getUnreadCount(userId);

      return {
        success: true,
        data: { unreadCount }
      };

    } catch (error) {
      console.error('Get unread count error:', error);
      return {
        success: false,
        error: 'Failed to get unread count'
      };
    }
  }

  /**
   * Get unread notification count by type for badge display
   */
  static async getUnreadCountByType(userId: string): Promise<ApiResponse> {
    try {
      // Validate user ID
      if (!ValidationUtils.isValidUUID(userId)) {
        return {
          success: false,
          error: 'Invalid user ID format'
        };
      }

      // Get unread count by type
      const unreadByType = await NotificationRepository.getUnreadCountByType(userId);

      // Calculate total unread count
      const totalUnread = unreadByType.reduce((sum, item) => sum + item.count, 0);

      // Get high priority unread count
      const highPriorityNotifications = await NotificationRepository.getHighPriorityUnreadNotifications(userId);
      const highPriorityCount = highPriorityNotifications.length;

      return {
        success: true,
        data: {
          totalUnread,
          highPriorityCount,
          byType: unreadByType.reduce((acc, item) => {
            acc[item.type] = item.count;
            return acc;
          }, {} as Record<string, number>)
        }
      };

    } catch (error) {
      console.error('Get unread count by type error:', error);
      return {
        success: false,
        error: 'Failed to get unread count by type'
      };
    }
  }

  /**
   * Get notification badge data for UI
   */
  static async getNotificationBadgeData(userId: string): Promise<ApiResponse> {
    try {
      // Validate user ID
      if (!ValidationUtils.isValidUUID(userId)) {
        return {
          success: false,
          error: 'Invalid user ID format'
        };
      }

      // Get comprehensive badge data
      const [unreadByType, highPriorityNotifications, recentNotifications] = await Promise.all([
        NotificationRepository.getUnreadCountByType(userId),
        NotificationRepository.getHighPriorityUnreadNotifications(userId),
        NotificationRepository.getRecentNotifications(userId, 3)
      ]);

      // Calculate totals
      const totalUnread = unreadByType.reduce((sum, item) => sum + item.count, 0);
      const highPriorityCount = highPriorityNotifications.length;

      // Convert recent notifications to API format
      const recentApiNotifications = recentNotifications.map(notification => 
        NotificationConverter.toApiNotificationWithChatRoom(notification)
      );

      return {
        success: true,
        data: {
          totalUnread,
          highPriorityCount,
          byType: unreadByType.reduce((acc, item) => {
            acc[item.type] = item.count;
            return acc;
          }, {} as Record<string, number>),
          recentNotifications: recentApiNotifications,
          hasHighPriority: highPriorityCount > 0
        }
      };

    } catch (error) {
      console.error('Get notification badge data error:', error);
      return {
        success: false,
        error: 'Failed to get notification badge data'
      };
    }
  }

  /**
   * Send message notification with enhanced mention detection
   */
  static async sendMessageNotification(
    recipientId: string,
    senderId: string,
    senderName: string,
    messageContent: string,
    chatRoomId: string,
    chatRoomName?: string,
    recipientUsername?: string
  ): Promise<ApiResponse> {
    try {
      // Enhanced mention detection - check for @username or @all
      const mentions = this.extractMentions(messageContent);
      const isMention = mentions.includes(recipientUsername || '') || mentions.includes('all');

      // Determine notification type and priority
      const type = isMention ? 'mention' : 'message';
      const priority = NotificationModel.determinePriority(type as any, messageContent, isMention);

      // Generate title
      const title = NotificationModel.generateTitle(type as any, senderName, chatRoomName);

      // Truncate content for notification preview
      const truncatedContent = messageContent.length > 100 
        ? messageContent.substring(0, 100) + '...' 
        : messageContent;

      // Create notification
      return await this.createNotification({
        userId: recipientId,
        type: type as any,
        title,
        content: truncatedContent,
        chatRoomId,
        priority
      });

    } catch (error) {
      console.error('Send message notification error:', error);
      return {
        success: false,
        error: 'Failed to send message notification'
      };
    }
  }

  /**
   * Extract mentions from message content
   */
  private static extractMentions(content: string): string[] {
    // Match @username patterns (alphanumeric and underscore)
    const mentionRegex = /@([a-zA-Z0-9_]+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1]);
    }

    return mentions;
  }

  /**
   * Send bulk message notifications for group messages
   */
  static async sendBulkMessageNotifications(
    recipientIds: string[],
    senderId: string,
    senderName: string,
    messageContent: string,
    chatRoomId: string,
    chatRoomName?: string,
    recipientUsernames?: Record<string, string>
  ): Promise<ApiResponse> {
    try {
      const notifications: CreateNotificationData[] = [];
      const mentions = this.extractMentions(messageContent);
      const hasAllMention = mentions.includes('all');

      for (const recipientId of recipientIds) {
        // Skip sender
        if (recipientId === senderId) continue;

        const recipientUsername = recipientUsernames?.[recipientId];
        const isMention = hasAllMention || mentions.includes(recipientUsername || '');

        // Determine notification type and priority
        const type = isMention ? 'mention' : 'message';
        const priority = NotificationModel.determinePriority(type as any, messageContent, isMention);

        // Generate title
        const title = NotificationModel.generateTitle(type as any, senderName, chatRoomName);

        // Truncate content for notification preview
        const truncatedContent = messageContent.length > 100 
          ? messageContent.substring(0, 100) + '...' 
          : messageContent;

        notifications.push({
          userId: recipientId,
          type: type as any,
          title,
          content: truncatedContent,
          chatRoomId,
          priority
        });
      }

      // Bulk create notifications
      if (notifications.length > 0) {
        const createdCount = await NotificationRepository.bulkCreateNotifications(notifications);

        // Send real-time notifications via WebSocket
        const wsService = WebSocketService.getInstance();
        for (const notification of notifications) {
          await wsService.sendNotification(notification.userId, {
            ...notification,
            id: `temp-${Date.now()}-${Math.random()}`, // Temporary ID for real-time
            isRead: false,
            createdAt: new Date()
          });
        }

        return {
          success: true,
          data: { createdCount },
          message: `${createdCount} notifications sent successfully`
        };
      }

      return {
        success: true,
        data: { createdCount: 0 },
        message: 'No notifications to send'
      };

    } catch (error) {
      console.error('Send bulk message notifications error:', error);
      return {
        success: false,
        error: 'Failed to send bulk message notifications'
      };
    }
  }

  /**
   * Send group invite notification
   */
  static async sendGroupInviteNotification(
    recipientId: string,
    inviterName: string,
    groupName: string,
    chatRoomId: string
  ): Promise<ApiResponse> {
    try {
      const title = NotificationModel.generateTitle('group_invite' as any, inviterName, groupName);

      return await this.createNotification({
        userId: recipientId,
        type: 'group_invite',
        title,
        content: `${inviterName} invited you to join ${groupName}`,
        chatRoomId,
        priority: 'high'
      });

    } catch (error) {
      console.error('Send group invite notification error:', error);
      return {
        success: false,
        error: 'Failed to send group invite notification'
      };
    }
  }

  /**
   * Send real-time notification update
   */
  static async sendRealTimeNotificationUpdate(userId: string, updateType: 'created' | 'read' | 'deleted', notificationData?: any): Promise<void> {
    try {
      const wsService = WebSocketService.getInstance();
      
      await wsService.sendNotification(userId, {
        type: 'notification_update',
        updateType,
        data: notificationData,
        timestamp: new Date().toISOString()
      });

      // Also send updated badge count
      const badgeResult = await this.getNotificationBadgeData(userId);
      if (badgeResult.success) {
        await wsService.sendNotification(userId, {
          type: 'badge_update',
          data: badgeResult.data,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Send real-time notification update error:', error);
    }
  }

  /**
   * Handle notification sound preferences
   */
  static async shouldPlaySound(userId: string, notificationType: string): Promise<boolean> {
    try {
      const settings = await NotificationRepository.getNotificationSettings(userId);
      
      if (!settings || !settings.soundEnabled) {
        return false;
      }

      // Check specific notification type settings
      switch (notificationType) {
        case 'mention':
          return settings.mentionNotifications;
        case 'group_invite':
        case 'group_activity':
          return settings.groupNotifications;
        case 'message':
        default:
          return settings.desktopNotifications;
      }
    } catch (error) {
      console.error('Check sound preferences error:', error);
      return false;
    }
  }

  /**
   * Clean up old notifications
   */
  static async cleanupOldNotifications(daysOld: number = 30): Promise<ApiResponse> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const deletedCount = await NotificationRepository.deleteOldNotifications(cutoffDate);

      return {
        success: true,
        data: { deletedCount },
        message: `Cleaned up ${deletedCount} old notifications`
      };

    } catch (error) {
      console.error('Cleanup old notifications error:', error);
      return {
        success: false,
        error: 'Failed to cleanup old notifications'
      };
    }
  }
}