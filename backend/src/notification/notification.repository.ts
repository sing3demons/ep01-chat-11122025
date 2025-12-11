import { Notification, NotificationSettings, ChatRoom } from '@prisma/client';
import prisma from '../config/database';
import { CreateNotificationData, UpdateNotificationData, UpdateNotificationSettingsData, NotificationQuery } from './notification.model';

export interface INotificationRepository {
  createNotification(data: CreateNotificationData): Promise<Notification>;
  getNotificationById(id: string): Promise<Notification | null>;
  getNotificationByIdWithChatRoom(id: string): Promise<any>;
  updateNotification(id: string, data: UpdateNotificationData): Promise<Notification>;
  deleteNotification(id: string): Promise<Notification>;
  getUserNotifications(query: NotificationQuery): Promise<any[]>;
  markAllAsRead(userId: string): Promise<number>;
  getUnreadCount(userId: string): Promise<number>;
  getUnreadCountByType(userId: string): Promise<{ type: string; count: number }[]>;
  getNotificationSettings(userId: string): Promise<NotificationSettings | null>;
  updateNotificationSettings(userId: string, data: UpdateNotificationSettingsData): Promise<NotificationSettings>;
  verifyUserExists(userId: string): Promise<boolean>;
  deleteOldNotifications(cutoffDate: Date): Promise<number>;
  getRecentNotifications(userId: string, limit?: number): Promise<any[]>;
  getHighPriorityUnreadNotifications(userId: string): Promise<Notification[]>;
  deleteAllUserNotifications(userId: string): Promise<number>;
  getNotificationStatistics(userId: string): Promise<{
    total: number;
    unread: number;
    byType: { type: string; count: number }[];
    byPriority: { priority: string; count: number }[];
  }>;
  bulkCreateNotifications(notifications: CreateNotificationData[]): Promise<number>;
}
/**
 * Notification Repository
 * Handles all database operations related to notifications
 */
export class NotificationRepository implements INotificationRepository {
  constructor(private readonly prismaInstance = prisma) {}
  /**
   * Create a new notification
   */
  async createNotification(data: CreateNotificationData): Promise<Notification> {
    return await this.prismaInstance.notification.create({
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
  async getNotificationById(id: string): Promise<Notification | null> {
    return await this.prismaInstance.notification.findUnique({
      where: { id }
    });
  }

  /**
   * Get notification by ID with chat room
   */
  async getNotificationByIdWithChatRoom(id: string): Promise<any> {
    return await this.prismaInstance.notification.findUnique({
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
  async updateNotification(id: string, data: UpdateNotificationData): Promise<Notification> {
    return await this.prismaInstance.notification.update({
      where: { id },
      data
    });
  }

  /**
   * Delete notification
   */
  async deleteNotification(id: string): Promise<Notification> {
    return await this.prismaInstance.notification.delete({
      where: { id }
    });
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(query: NotificationQuery): Promise<any[]> {
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

    return await this.prismaInstance.notification.findMany({
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
  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.prismaInstance.notification.updateMany({
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
  async getUnreadCount(userId: string): Promise<number> {
    return await this.prismaInstance.notification.count({
      where: {
        userId,
        isRead: false
      }
    });
  }

  /**
   * Get unread notifications by type for user
   */
  async getUnreadCountByType(userId: string): Promise<{ type: string; count: number }[]> {
    const result = await this.prismaInstance.notification.groupBy({
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
  async getNotificationSettings(userId: string): Promise<NotificationSettings | null> {
    return await this.prismaInstance.notificationSettings.findUnique({
      where: { userId }
    });
  }

  /**
   * Update notification settings for user
   */
  async updateNotificationSettings(
    userId: string,
    data: UpdateNotificationSettingsData
  ): Promise<NotificationSettings> {
    return await this.prismaInstance.notificationSettings.upsert({
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
  async verifyUserExists(userId: string): Promise<boolean> {
    const user = await this.prismaInstance.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    return user !== null;
  }

  /**
   * Delete old notifications
   */
  async deleteOldNotifications(cutoffDate: Date): Promise<number> {
    const result = await this.prismaInstance.notification.deleteMany({
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
  async getRecentNotifications(
    userId: string,
    limit: number = 5
  ): Promise<any[]> {
    return await this.prismaInstance.notification.findMany({
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
  async getHighPriorityUnreadNotifications(userId: string): Promise<Notification[]> {
    return await this.prismaInstance.notification.findMany({
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
  async deleteAllUserNotifications(userId: string): Promise<number> {
    const result = await this.prismaInstance.notification.deleteMany({
      where: { userId }
    });

    return result.count;
  }

  /**
   * Get notification statistics for user
   */
  async getNotificationStatistics(userId: string): Promise<{
    total: number;
    unread: number;
    byType: { type: string; count: number }[];
    byPriority: { priority: string; count: number }[];
  }> {
    const [total, unread, byType, byPriority] = await Promise.all([
      this.prismaInstance.notification.count({
        where: { userId }
      }),
      this.prismaInstance.notification.count({
        where: { userId, isRead: false }
      }),
      this.prismaInstance.notification.groupBy({
        by: ['type'],
        where: { userId },
        _count: { id: true }
      }),
      this.prismaInstance.notification.groupBy({
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
  async bulkCreateNotifications(notifications: CreateNotificationData[]): Promise<number> {
    const result = await this.prismaInstance.notification.createMany({
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