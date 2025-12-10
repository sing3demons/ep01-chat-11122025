import { 
  Notification as PrismaNotification, 
  NotificationSettings as PrismaNotificationSettings,
  ChatRoom as PrismaChatRoom
} from '@prisma/client';

import { 
  Notification, 
  NotificationWithChatRoom, 
  NotificationSettings, 
  NotificationType, 
  NotificationPriority 
} from './notification.model';

/**
 * Notification model converters
 */
export class NotificationConverter {
  /**
   * Convert Prisma Notification to API Notification
   */
  static toApiNotification(prismaNotification: PrismaNotification): Notification {
    return {
      id: prismaNotification.id,
      userId: prismaNotification.userId,
      type: prismaNotification.type as NotificationType,
      title: prismaNotification.title,
      content: prismaNotification.content,
      chatRoomId: prismaNotification.chatRoomId || undefined,
      isRead: prismaNotification.isRead,
      priority: prismaNotification.priority as NotificationPriority,
      createdAt: prismaNotification.createdAt,
    };
  }

  /**
   * Convert Prisma Notification with ChatRoom to API format
   */
  static toApiNotificationWithChatRoom(
    prismaNotification: PrismaNotification & {
      chatRoom?: PrismaChatRoom | null;
    }
  ): NotificationWithChatRoom {
    const notification = this.toApiNotification(prismaNotification);
    
    return {
      ...notification,
      chatRoom: prismaNotification.chatRoom ? {
        id: prismaNotification.chatRoom.id,
        name: prismaNotification.chatRoom.name || undefined,
        type: prismaNotification.chatRoom.type,
      } : undefined,
    };
  }

  /**
   * Convert Prisma NotificationSettings to API format
   */
  static toApiNotificationSettings(prismaSettings: PrismaNotificationSettings): NotificationSettings {
    return {
      userId: prismaSettings.userId,
      soundEnabled: prismaSettings.soundEnabled,
      desktopNotifications: prismaSettings.desktopNotifications,
      mentionNotifications: prismaSettings.mentionNotifications,
      groupNotifications: prismaSettings.groupNotifications,
      updatedAt: prismaSettings.updatedAt,
    };
  }

  /**
   * Convert API Notification to Prisma format
   */
  static toPrismaNotification(apiNotification: Notification): Omit<PrismaNotification, 'id'> {
    return {
      userId: apiNotification.userId,
      type: apiNotification.type,
      title: apiNotification.title,
      content: apiNotification.content,
      chatRoomId: apiNotification.chatRoomId || null,
      isRead: apiNotification.isRead,
      priority: apiNotification.priority,
      createdAt: apiNotification.createdAt,
    };
  }

  /**
   * Convert notifications array with pagination info
   */
  static toApiNotificationsWithPagination(
    prismaNotifications: (PrismaNotification & { chatRoom?: PrismaChatRoom | null })[],
    total: number,
    page: number,
    limit: number
  ): {
    notifications: NotificationWithChatRoom[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    unreadCount: number;
  } {
    const notifications = prismaNotifications.map(notif => this.toApiNotificationWithChatRoom(notif));
    const totalPages = Math.ceil(total / limit);
    const unreadCount = notifications.filter(n => !n.isRead).length;
    
    return {
      notifications,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      unreadCount,
    };
  }
}