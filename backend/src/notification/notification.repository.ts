import { Notification, NotificationSettings, ChatRoom } from '@prisma/client';
import prisma from '../config/database';
import { CreateNotificationData, UpdateNotificationData, UpdateNotificationSettingsData, NotificationQuery } from './notification.model';

/**
 * Notification Repository
 * Handles all database operations related to notifications
 */
export class NotificationRepository {
  /**
   * Create a new notification
   */
  static async createNotification(data: CreateNotificationData): Promise<Notification> {
    return await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        content: data.content,
        chatRoomId: data.chatRoomId,
        priority: data.priority || 'normal',
        isRead: false
      }
    });
  }

  /**
   * Get notification by ID
   */
  static async getNotificationById(id: string): Promise<Notification | null> {
    return await prisma.notification.findUnique({
      where: { id }
    });
  }

  /**
   * Get notification by ID with chat room
   */
  static async getNotificationByIdWithChatRoom(id: string): Promise<any> {
    return await prisma.notification.findUnique({
      where: { id },
      include: {
        chatRoom: {
          select: {
            id: true,
            name: true,
            type: true,
            createdAt: true,
            createdBy: true,
            lastMessageAt: true
          }
        }
      }
    });
  }

  /**
   * Update notification
   */
  static async updateNotification(id: string, data: UpdateNotificationData): Promise<Notification> {
    return await prisma.notification.update({
      where: { id },
      data
    });
  }

  /**
   * Delete notification
   */
  static async deleteNotification(id: string): Promise<Notification> {
    return await prisma.notification.delete({
      where: { id }
    });
  }

  /**
   * Get user notifications
   */
  static async getUserNotifications(query: NotificationQuery): Promise<any[]> {
    const whereClause: any = {
      userId: query.userId
    };

    // Add filters
    if (query.isRead !== undefined) {
      whereClause.isRead = query.isRead;
    }

    if (query.type) {
      whereClause.type = query.type;
    }

    if (query.priority) {
      whereClause.priority = query.priority;
    }

    // Add date range filters
    if (query.fromDate || query.toDate) {
      whereClause.createdAt = {};
      if (query.fromDate) {
        whereClause.createdAt.gte = query.fromDate;
      }
      if (query.toDate) {
        whereClause.createdAt.lte = query.toDate;
      }
    }

    return await prisma.notification.findMany({
      where: whereClause,
      include: {
        chatRoom: {
          select: {
            id: true,
            name: true,
            type: true,
            createdAt: true,
            createdBy: true,
            lastMessageAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: query.limit || 20,
      skip: query.offset || 0
    });
  }

  /**
   * Mark all notifications as read for user
   */
  static async markAllAsRead(userId: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false
      },
      data: {
        isRead: true
      }
    });

    return result.count;
  }

  /**
   * Get unread notification count for user
   */
  static async getUnreadCount(userId: string): Promise<number> {
    return await prisma.notification.count({
      where: {
        userId,
        isRead: false
      }
    });
  }

  /**
   * Get unread notifications by type for user
   */
  static async getUnreadCountByType(userId: string): Promise<{ type: string; count: number }[]> {
    const result = await prisma.notification.groupBy({
      by: ['type'],
      where: {
        userId,
        isRead: false
      },
      _count: {
        id: true
      }
    });

    return result.map(item => ({
      type: item.type,
      count: item._count.id
    }));
  }

  /**
   * Get notification settings for user
   */
  static async getNotificationSettings(userId: string): Promise<NotificationSettings | null> {
    return await prisma.notificationSettings.findUnique({
      where: { userId }
    });
  }

  /**
   * Update notification settings for user
   */
  static async updateNotificationSettings(
    userId: string,
    data: UpdateNotificationSettingsData
  ): Promise<NotificationSettings> {
    return await prisma.notificationSettings.upsert({
      where: { userId },
      update: {
        ...data,
        updatedAt: new Date()
      },
      create: {
        userId,
        soundEnabled: data.soundEnabled ?? true,
        desktopNotifications: data.desktopNotifications ?? true,
        mentionNotifications: data.mentionNotifications ?? true,
        groupNotifications: data.groupNotifications ?? true,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Verify user exists
   */
  static async verifyUserExists(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    return user !== null;
  }

  /**
   * Delete old notifications
   */
  static async deleteOldNotifications(cutoffDate: Date): Promise<number> {
    const result = await prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        },
        isRead: true // Only delete read notifications
      }
    });

    return result.count;
  }

  /**
   * Get recent notifications for user
   */
  static async getRecentNotifications(
    userId: string,
    limit: number = 5
  ): Promise<any[]> {
    return await prisma.notification.findMany({
      where: { userId },
      include: {
        chatRoom: {
          select: {
            id: true,
            name: true,
            type: true,
            createdAt: true,
            createdBy: true,
            lastMessageAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });
  }

  /**
   * Get high priority unread notifications
   */
  static async getHighPriorityUnreadNotifications(userId: string): Promise<Notification[]> {
    return await prisma.notification.findMany({
      where: {
        userId,
        isRead: false,
        priority: {
          in: ['high', 'urgent']
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  /**
   * Delete all notifications for user
   */
  static async deleteAllUserNotifications(userId: string): Promise<number> {
    const result = await prisma.notification.deleteMany({
      where: { userId }
    });

    return result.count;
  }

  /**
   * Get notification statistics for user
   */
  static async getNotificationStatistics(userId: string): Promise<{
    total: number;
    unread: number;
    byType: { type: string; count: number }[];
    byPriority: { priority: string; count: number }[];
  }> {
    const [total, unread, byType, byPriority] = await Promise.all([
      prisma.notification.count({
        where: { userId }
      }),
      prisma.notification.count({
        where: { userId, isRead: false }
      }),
      prisma.notification.groupBy({
        by: ['type'],
        where: { userId },
        _count: { id: true }
      }),
      prisma.notification.groupBy({
        by: ['priority'],
        where: { userId },
        _count: { id: true }
      })
    ]);

    return {
      total,
      unread,
      byType: byType.map(item => ({
        type: item.type,
        count: item._count.id
      })),
      byPriority: byPriority.map(item => ({
        priority: item.priority,
        count: item._count.id
      }))
    };
  }

  /**
   * Bulk create notifications
   */
  static async bulkCreateNotifications(notifications: CreateNotificationData[]): Promise<number> {
    const result = await prisma.notification.createMany({
      data: notifications.map(notification => ({
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        content: notification.content,
        chatRoomId: notification.chatRoomId,
        priority: notification.priority || 'normal',
        isRead: false
      }))
    });

    return result.count;
  }
}