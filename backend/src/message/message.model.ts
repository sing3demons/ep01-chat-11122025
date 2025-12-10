import { ValidationUtils } from '../utils/validation';
import { MESSAGE_STATUS } from '../config/constants';

/**
 * Message model interfaces and validation
 */

export interface Message {
  id: string;
  content: string;
  senderId: string;
  chatRoomId: string;
  status: MessageStatus;
  timestamp: Date;
  createdAt: Date;
}

export interface MessageWithSender extends Message {
  sender: {
    id: string;
    username: string;
    isOnline: boolean;
  };
}

export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface CreateMessageData {
  content: string;
  senderId: string;
  chatRoomId: string;
}

export interface UpdateMessageData {
  content?: string;
  status?: MessageStatus;
}

export interface MessageValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData?: any;
}

export interface MessageSearchQuery {
  query: string;
  chatRoomId?: string;
  senderId?: string;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Message model validation functions
 */
export class MessageModel {
  /**
   * Validate message creation data
   */
  static validateCreateMessage(data: CreateMessageData): MessageValidationResult {
    const errors: string[] = [];
    const sanitizedData: Partial<CreateMessageData> = {};

    // Validate and sanitize content
    if (!data.content) {
      errors.push('Message content is required');
    } else {
      const contentValidation = ValidationUtils.isValidMessage(data.content);
      if (!contentValidation.isValid) {
        errors.push(...contentValidation.errors);
      } else {
        sanitizedData.content = ValidationUtils.sanitizeString(data.content);
      }
    }

    // Validate senderId
    if (!data.senderId) {
      errors.push('Sender ID is required');
    } else if (!ValidationUtils.isValidUUID(data.senderId)) {
      errors.push('Invalid sender ID format');
    } else {
      sanitizedData.senderId = data.senderId;
    }

    // Validate chatRoomId
    if (!data.chatRoomId) {
      errors.push('Chat room ID is required');
    } else if (!ValidationUtils.isValidUUID(data.chatRoomId)) {
      errors.push('Invalid chat room ID format');
    } else {
      sanitizedData.chatRoomId = data.chatRoomId;
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? sanitizedData as CreateMessageData : undefined,
    };
  }

  /**
   * Validate message update data
   */
  static validateUpdateMessage(data: UpdateMessageData): MessageValidationResult {
    const errors: string[] = [];
    const sanitizedData: Partial<UpdateMessageData> = {};

    // Validate content if provided
    if (data.content !== undefined) {
      if (data.content === null || data.content === '') {
        errors.push('Message content cannot be empty');
      } else {
        const contentValidation = ValidationUtils.isValidMessage(data.content);
        if (!contentValidation.isValid) {
          errors.push(...contentValidation.errors);
        } else {
          sanitizedData.content = ValidationUtils.sanitizeString(data.content);
        }
      }
    }

    // Validate status if provided
    if (data.status !== undefined) {
      const validStatuses = Object.values(MESSAGE_STATUS);
      if (!validStatuses.includes(data.status as any)) {
        errors.push(`Invalid message status. Must be one of: ${validStatuses.join(', ')}`);
      } else {
        sanitizedData.status = data.status;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? sanitizedData : undefined,
    };
  }

  /**
   * Validate message search query
   */
  static validateSearchQuery(query: MessageSearchQuery): MessageValidationResult {
    const errors: string[] = [];
    const sanitizedData: Partial<MessageSearchQuery> = {};

    // Validate and sanitize search query
    if (!query.query) {
      errors.push('Search query is required');
    } else {
      const sanitizedQuery = ValidationUtils.sanitizeSearchQuery(query.query);
      if (sanitizedQuery.length === 0) {
        errors.push('Search query cannot be empty after sanitization');
      } else if (sanitizedQuery.length < 2) {
        errors.push('Search query must be at least 2 characters long');
      } else {
        sanitizedData.query = sanitizedQuery;
      }
    }

    // Validate chatRoomId if provided
    if (query.chatRoomId !== undefined) {
      if (!ValidationUtils.isValidUUID(query.chatRoomId)) {
        errors.push('Invalid chat room ID format');
      } else {
        sanitizedData.chatRoomId = query.chatRoomId;
      }
    }

    // Validate senderId if provided
    if (query.senderId !== undefined) {
      if (!ValidationUtils.isValidUUID(query.senderId)) {
        errors.push('Invalid sender ID format');
      } else {
        sanitizedData.senderId = query.senderId;
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
      sanitizedData: errors.length === 0 ? sanitizedData as MessageSearchQuery : undefined,
    };
  }

  /**
   * Validate message status transition
   */
  static isValidStatusTransition(currentStatus: MessageStatus, newStatus: MessageStatus): boolean {
    const statusOrder = [MESSAGE_STATUS.SENT, MESSAGE_STATUS.DELIVERED, MESSAGE_STATUS.READ];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const newIndex = statusOrder.indexOf(newStatus);
    
    // Status can only progress forward, not backward
    return newIndex >= currentIndex;
  }

  /**
   * Check if message content contains mentions
   */
  static extractMentions(content: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    
    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1]);
    }
    
    return mentions;
  }

  /**
   * Check if message is empty or only whitespace
   */
  static isEmpty(content: string): boolean {
    return !content || content.trim().length === 0;
  }

  /**
   * Truncate message content for preview
   */
  static truncateForPreview(content: string, maxLength: number = 50): string {
    if (content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength - 3) + '...';
  }
}