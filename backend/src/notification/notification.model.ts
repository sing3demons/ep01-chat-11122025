import { ValidationUtils } from '../utils/validation';
import { NOTIFICATION_TYPES, NOTIFICATION_PRIORITIES } from '../config/constants';

/**
 * Notification model interfaces and validation
 */

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  chatRoomId?: string;
  isRead: boolean;
  priority: NotificationPriority;
  createdAt: Date;
}

export interface NotificationWithChatRoom extends Notification {
  chatRoom?: {
    id: string;
    name?: string;
    type: string;
  };
}

export interface NotificationSettings {
  userId: string;
  soundEnabled: boolean;
  desktopNotifications: boolean;
  mentionNotifications: boolean;
  groupNotifications: boolean;
  updatedAt: Date;
}

export type NotificationType = 'message' | 'mention' | 'group_invite' | 'group_activity' | 'system';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  chatRoomId?: string;
  priority?: NotificationPriority;
}

export interface UpdateNotificationData {
  isRead?: boolean;
  priority?: NotificationPriority;
}

export interface UpdateNotificationSettingsData {
  soundEnabled?: boolean;
  desktopNotifications?: boolean;
  mentionNotifications?: boolean;
  groupNotifications?: boolean;
}

export interface NotificationValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData?: any;
}

export interface NotificationQuery {
  userId: string;
  isRead?: boolean;
  type?: NotificationType;
  priority?: NotificationPriority;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Notification model validation functions
 */
export class NotificationModel {
  /**
   * Validate notification creation data
   */
  static validateCreateNotification(data: CreateNotificationData): NotificationValidationResult {
    const errors: string[] = [];
    const sanitizedData: Partial<CreateNotificationData> = {};

    // Validate userId
    if (!data.userId) {
      errors.push('User ID is required');
    } else if (!ValidationUtils.isValidUUID(data.userId)) {
      errors.push('Invalid user ID format');
    } else {
      sanitizedData.userId = data.userId;
    }

    // Validate type
    if (!data.type) {
      errors.push('Notification type is required');
    } else if (!Object.values(NOTIFICATION_TYPES).includes(data.type as any)) {
      errors.push(`Invalid notification type. Must be one of: ${Object.values(NOTIFICATION_TYPES).join(', ')}`);
    } else {
      sanitizedData.type = data.type;
    }

    // Validate and sanitize title
    if (!data.title) {
      errors.push('Notification title is required');
    } else if (typeof data.title !== 'string') {
      errors.push('Title must be a string');
    } else {
      const sanitizedTitle = ValidationUtils.sanitizeString(data.title);
      if (sanitizedTitle.length === 0) {
        errors.push('Title cannot be empty after sanitization');
      } else if (sanitizedTitle.length > 255) {
        errors.push('Title must not exceed 255 characters');
      } else {
        sanitizedData.title = sanitizedTitle;
      }
    }

    // Validate and sanitize content
    if (!data.content) {
      errors.push('Notification content is required');
    } else if (typeof data.content !== 'string') {
      errors.push('Content must be a string');
    } else {
      const sanitizedContent = ValidationUtils.sanitizeString(data.content);
      if (sanitizedContent.length === 0) {
        errors.push('Content cannot be empty after sanitization');
      } else if (sanitizedContent.length > 1000) {
        errors.push('Content must not exceed 1000 characters');
      } else {
        sanitizedData.content = sanitizedContent;
      }
    }

    // Validate chatRoomId if provided
    if (data.chatRoomId !== undefined) {
      if (data.chatRoomId && !ValidationUtils.isValidUUID(data.chatRoomId)) {
        errors.push('Invalid chat room ID format');
      } else {
        sanitizedData.chatRoomId = data.chatRoomId;
      }
    }

    // Validate priority
    if (data.priority !== undefined) {
      if (!Object.values(NOTIFICATION_PRIORITIES).includes(data.priority as any)) {
        errors.push(`Invalid priority. Must be one of: ${Object.values(NOTIFICATION_PRIORITIES).join(', ')}`);
      } else {
        sanitizedData.priority = data.priority;
      }
    } else {
      sanitizedData.priority = NOTIFICATION_PRIORITIES.NORMAL; // Default priority
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? sanitizedData as CreateNotificationData : undefined,
    };
  }

  /**
   * Validate notification update data
   */
  static validateUpdateNotification(data: UpdateNotificationData): NotificationValidationResult {
    const errors: string[] = [];
    const sanitizedData: Partial<UpdateNotificationData> = {};

    // Validate isRead if provided
    if (data.isRead !== undefined) {
      if (typeof data.isRead !== 'boolean') {
        errors.push('isRead must be a boolean');
      } else {
        sanitizedData.isRead = data.isRead;
      }
    }

    // Validate priority if provided
    if (data.priority !== undefined) {
      if (!Object.values(NOTIFICATION_PRIORITIES).includes(data.priority as any)) {
        errors.push(`Invalid priority. Must be one of: ${Object.values(NOTIFICATION_PRIORITIES).join(', ')}`);
      } else {
        sanitizedData.priority = data.priority;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? sanitizedData : undefined,
    };
  }

  /**
   * Validate notification settings update data
   */
  static validateUpdateNotificationSettings(data: UpdateNotificationSettingsData): NotificationValidationResult {
    const errors: string[] = [];
    const sanitizedData: Partial<UpdateNotificationSettingsData> = {};

    // Validate boolean fields
    const booleanFields: (keyof UpdateNotificationSettingsData)[] = [
      'soundEnabled',
      'desktopNotifications',
      'mentionNotifications',
      'groupNotifications',
    ];

    for (const field of booleanFields) {
      if (data[field] !== undefined) {
        if (typeof data[field] !== 'boolean') {
          errors.push(`${field} must be a boolean`);
        } else {
          (sanitizedData as any)[field] = data[field];
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? sanitizedData : undefined,
    };
  }

  /**
   * Validate notification query parameters
   */
  static validateNotificationQuery(query: NotificationQuery): NotificationValidationResult {
    const errors: string[] = [];
    const sanitizedData: Partial<NotificationQuery> = {};

    // Validate userId
    if (!query.userId) {
      errors.push('User ID is required');
    } else if (!ValidationUtils.isValidUUID(query.userId)) {
      errors.push('Invalid user ID format');
    } else {
      sanitizedData.userId = query.userId;
    }

    // Validate isRead if provided
    if (query.isRead !== undefined) {
      if (typeof query.isRead !== 'boolean') {
        errors.push('isRead must be a boolean');
      } else {
        sanitizedData.isRead = query.isRead;
      }
    }

    // Validate type if provided
    if (query.type !== undefined) {
      if (!Object.values(NOTIFICATION_TYPES).includes(query.type as any)) {
        errors.push(`Invalid notification type. Must be one of: ${Object.values(NOTIFICATION_TYPES).join(', ')}`);
      } else {
        sanitizedData.type = query.type;
      }
    }

    // Validate priority if provided
    if (query.priority !== undefined) {
      if (!Object.values(NOTIFICATION_PRIORITIES).includes(query.priority as any)) {
        errors.push(`Invalid priority. Must be one of: ${Object.values(NOTIFICATION_PRIORITIES).join(', ')}`);
      } else {
        sanitizedData.priority = query.priority;
      }
    }

    // Validate date range
    if (query.fromDate !== undefined) {
      if (!(query.fromDate instanceof Date) || isNaN(query.fromDate.getTime())) {
        errors.push('fromDate must be a valid Date');
      } else {
        sanitizedData.fromDate = query.fromDate;
      }
    }

    if (query.toDate !== undefined) {
      if (!(query.toDate instanceof Date) || isNaN(query.toDate.getTime())) {
        errors.push('toDate must be a valid Date');
      } else {
        sanitizedData.toDate = query.toDate;
      }
    }

    // Validate date range logic
    if (sanitizedData.fromDate && sanitizedData.toDate && sanitizedData.fromDate > sanitizedData.toDate) {
      errors.push('fromDate cannot be after toDate');
    }

    // Validate pagination
    if (query.limit !== undefined) {
      if (typeof query.limit !== 'number' || query.limit < 1 || query.limit > 100) {
        errors.push('Limit must be a number between 1 and 100');
      } else {
        sanitizedData.limit = query.limit;
      }
    }

    if (query.offset !== undefined) {
      if (typeof query.offset !== 'number' || query.offset < 0) {
        errors.push('Offset must be a non-negative number');
      } else {
        sanitizedData.offset = query.offset;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? sanitizedData as NotificationQuery : undefined,
    };
  }

  /**
   * Determine notification priority based on type and content
   */
  static determinePriority(type: NotificationType, content: string, isMention: boolean = false): NotificationPriority {
    if (isMention || type === NOTIFICATION_TYPES.MENTION) {
      return NOTIFICATION_PRIORITIES.HIGH;
    }

    switch (type) {
      case NOTIFICATION_TYPES.SYSTEM:
        return NOTIFICATION_PRIORITIES.URGENT;
      case NOTIFICATION_TYPES.GROUP_INVITE:
        return NOTIFICATION_PRIORITIES.HIGH;
      case NOTIFICATION_TYPES.GROUP_ACTIVITY:
        return NOTIFICATION_PRIORITIES.NORMAL;
      case NOTIFICATION_TYPES.MESSAGE:
      default:
        return NOTIFICATION_PRIORITIES.NORMAL;
    }
  }

  /**
   * Check if notification should be sent based on user settings
   */
  static shouldSendNotification(
    type: NotificationType,
    settings: NotificationSettings,
    isMention: boolean = false
  ): boolean {
    // Always send system notifications
    if (type === NOTIFICATION_TYPES.SYSTEM) {
      return true;
    }

    // Check desktop notifications setting
    if (!settings.desktopNotifications) {
      return false;
    }

    // Check specific notification type settings
    switch (type) {
      case NOTIFICATION_TYPES.MENTION:
        return settings.mentionNotifications;
      case NOTIFICATION_TYPES.GROUP_INVITE:
      case NOTIFICATION_TYPES.GROUP_ACTIVITY:
        return settings.groupNotifications;
      case NOTIFICATION_TYPES.MESSAGE:
        // For regular messages, check if it's a mention
        return isMention ? settings.mentionNotifications : true;
      default:
        return true;
    }
  }

  /**
   * Generate notification title based on type and context
   */
  static generateTitle(type: NotificationType, senderName: string, chatRoomName?: string): string {
    switch (type) {
      case NOTIFICATION_TYPES.MESSAGE:
        return chatRoomName ? `${senderName} in ${chatRoomName}` : senderName;
      case NOTIFICATION_TYPES.MENTION:
        return `${senderName} mentioned you`;
      case NOTIFICATION_TYPES.GROUP_INVITE:
        return `${senderName} invited you to ${chatRoomName}`;
      case NOTIFICATION_TYPES.GROUP_ACTIVITY:
        return `Group activity in ${chatRoomName}`;
      case NOTIFICATION_TYPES.SYSTEM:
        return 'System Notification';
      default:
        return 'New Notification';
    }
  }

  /**
   * Check if notification is high priority
   */
  static isHighPriority(notification: Notification): boolean {
    return [NOTIFICATION_PRIORITIES.HIGH, NOTIFICATION_PRIORITIES.URGENT].includes(notification.priority as any);
  }

  /**
   * Get unread notification count by type
   */
  static getUnreadCountByType(notifications: Notification[]): Record<NotificationType, number> {
    const counts = Object.values(NOTIFICATION_TYPES).reduce((acc, type) => {
      acc[type] = 0;
      return acc;
    }, {} as Record<NotificationType, number>);

    notifications
      .filter(n => !n.isRead)
      .forEach(n => {
        counts[n.type]++;
      });

    return counts;
  }
}