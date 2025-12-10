import { ValidationUtils } from '../utils/validation';
import { CHAT_ROOM_TYPES, USER_ROLES } from '../config/constants';

/**
 * ChatRoom model interfaces and validation
 */

export interface ChatRoom {
  id: string;
  name?: string;
  type: ChatRoomType;
  createdBy: string;
  createdAt: Date;
  lastMessageAt: Date;
}

export interface ChatRoomWithParticipants extends ChatRoom {
  participants: ChatRoomParticipant[];
}

export interface ChatRoomWithDetails extends ChatRoomWithParticipants {
  participantCount: number;
  lastMessage?: {
    id: string;
    content: string;
    senderId: string;
    senderUsername: string;
    createdAt: Date;
  };
}

export interface ChatRoomParticipant {
  chatRoomId: string;
  userId: string;
  role: ParticipantRole;
  joinedAt: Date;
  user?: {
    id: string;
    username: string;
    isOnline: boolean;
    lastSeen: Date;
  };
}

export type ChatRoomType = 'direct' | 'group';
export type ParticipantRole = 'admin' | 'member';

export interface CreateChatRoomData {
  name?: string;
  type: ChatRoomType;
  createdBy: string;
  participantIds: string[];
}

export interface UpdateChatRoomData {
  name?: string;
  lastMessageAt?: Date;
}

export interface AddParticipantData {
  userId: string;
  role?: ParticipantRole;
}

export interface UpdateParticipantData {
  role?: ParticipantRole;
}

export interface ChatRoomValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData?: any;
}

/**
 * ChatRoom model validation functions
 */
export class ChatRoomModel {
  /**
   * Validate chat room creation data
   */
  static validateCreateChatRoom(data: CreateChatRoomData): ChatRoomValidationResult {
    const errors: string[] = [];
    const sanitizedData: Partial<CreateChatRoomData> = {};

    // Validate type
    if (!data.type) {
      errors.push('Chat room type is required');
    } else if (!Object.values(CHAT_ROOM_TYPES).includes(data.type as any)) {
      errors.push(`Invalid chat room type. Must be one of: ${Object.values(CHAT_ROOM_TYPES).join(', ')}`);
    } else {
      sanitizedData.type = data.type;
    }

    // Validate createdBy
    if (!data.createdBy) {
      errors.push('Creator ID is required');
    } else if (!ValidationUtils.isValidUUID(data.createdBy)) {
      errors.push('Invalid creator ID format');
    } else {
      sanitizedData.createdBy = data.createdBy;
    }

    // Validate participantIds
    if (!data.participantIds || !Array.isArray(data.participantIds)) {
      errors.push('Participant IDs must be an array');
    } else if (data.participantIds.length === 0) {
      errors.push('At least one participant is required');
    } else {
      const invalidIds = data.participantIds.filter(id => !ValidationUtils.isValidUUID(id));
      if (invalidIds.length > 0) {
        errors.push('All participant IDs must be valid UUIDs');
      } else {
        // Remove duplicates and ensure creator is included
        const uniqueParticipants = Array.from(new Set([data.createdBy, ...data.participantIds]));
        sanitizedData.participantIds = uniqueParticipants;
      }
    }

    // Validate name based on type
    if (data.type === CHAT_ROOM_TYPES.GROUP) {
      if (!data.name) {
        errors.push('Group name is required for group chats');
      } else {
        const nameValidation = ValidationUtils.isValidGroupName(data.name);
        if (!nameValidation.isValid) {
          errors.push(...nameValidation.errors);
        } else {
          sanitizedData.name = ValidationUtils.sanitizeString(data.name);
        }
      }
    } else if (data.type === CHAT_ROOM_TYPES.DIRECT) {
      // Direct chats should have exactly 2 participants
      if (sanitizedData.participantIds && sanitizedData.participantIds.length !== 2) {
        errors.push('Direct chats must have exactly 2 participants');
      }
      // Direct chats don't need names
      sanitizedData.name = undefined;
    }

    // Validate participant limits
    if (sanitizedData.participantIds) {
      if (data.type === CHAT_ROOM_TYPES.GROUP && sanitizedData.participantIds.length > 256) {
        errors.push('Group chats cannot have more than 256 participants');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? sanitizedData as CreateChatRoomData : undefined,
    };
  }

  /**
   * Validate chat room update data
   */
  static validateUpdateChatRoom(data: UpdateChatRoomData): ChatRoomValidationResult {
    const errors: string[] = [];
    const sanitizedData: Partial<UpdateChatRoomData> = {};

    // Validate name if provided
    if (data.name !== undefined) {
      if (data.name === null || data.name === '') {
        errors.push('Group name cannot be empty');
      } else {
        const nameValidation = ValidationUtils.isValidGroupName(data.name);
        if (!nameValidation.isValid) {
          errors.push(...nameValidation.errors);
        } else {
          sanitizedData.name = ValidationUtils.sanitizeString(data.name);
        }
      }
    }

    // Validate lastMessageAt if provided
    if (data.lastMessageAt !== undefined) {
      if (!(data.lastMessageAt instanceof Date) || isNaN(data.lastMessageAt.getTime())) {
        errors.push('lastMessageAt must be a valid Date');
      } else {
        sanitizedData.lastMessageAt = data.lastMessageAt;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? sanitizedData : undefined,
    };
  }

  /**
   * Validate participant addition data
   */
  static validateAddParticipant(data: AddParticipantData): ChatRoomValidationResult {
    const errors: string[] = [];
    const sanitizedData: Partial<AddParticipantData> = {};

    // Validate userId
    if (!data.userId) {
      errors.push('User ID is required');
    } else if (!ValidationUtils.isValidUUID(data.userId)) {
      errors.push('Invalid user ID format');
    } else {
      sanitizedData.userId = data.userId;
    }

    // Validate role if provided
    if (data.role !== undefined) {
      if (!Object.values(USER_ROLES).includes(data.role as any)) {
        errors.push(`Invalid role. Must be one of: ${Object.values(USER_ROLES).join(', ')}`);
      } else {
        sanitizedData.role = data.role;
      }
    } else {
      sanitizedData.role = USER_ROLES.MEMBER; // Default role
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? sanitizedData as AddParticipantData : undefined,
    };
  }

  /**
   * Validate participant update data
   */
  static validateUpdateParticipant(data: UpdateParticipantData): ChatRoomValidationResult {
    const errors: string[] = [];
    const sanitizedData: Partial<UpdateParticipantData> = {};

    // Validate role if provided
    if (data.role !== undefined) {
      if (!Object.values(USER_ROLES).includes(data.role as any)) {
        errors.push(`Invalid role. Must be one of: ${Object.values(USER_ROLES).join(', ')}`);
      } else {
        sanitizedData.role = data.role;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? sanitizedData : undefined,
    };
  }

  /**
   * Check if user has admin privileges in chat room
   */
  static isAdmin(participants: ChatRoomParticipant[], userId: string): boolean {
    const participant = participants.find(p => p.userId === userId);
    return participant?.role === USER_ROLES.ADMIN;
  }

  /**
   * Check if user is participant in chat room
   */
  static isParticipant(participants: ChatRoomParticipant[], userId: string): boolean {
    return participants.some(p => p.userId === userId);
  }

  /**
   * Get admin count in chat room
   */
  static getAdminCount(participants: ChatRoomParticipant[]): number {
    return participants.filter(p => p.role === USER_ROLES.ADMIN).length;
  }

  /**
   * Check if chat room can have participant removed (must have at least one admin)
   */
  static canRemoveParticipant(participants: ChatRoomParticipant[], userIdToRemove: string): boolean {
    const participant = participants.find(p => p.userId === userIdToRemove);
    if (!participant) {
      return false; // User is not a participant
    }

    // If removing an admin, ensure at least one admin remains
    if (participant.role === USER_ROLES.ADMIN) {
      const adminCount = this.getAdminCount(participants);
      return adminCount > 1;
    }

    return true; // Can always remove non-admin members
  }

  /**
   * Generate chat room display name
   */
  static generateDisplayName(chatRoom: ChatRoomWithParticipants, currentUserId: string): string {
    if (chatRoom.type === CHAT_ROOM_TYPES.GROUP) {
      return chatRoom.name || 'Unnamed Group';
    }

    // For direct chats, use the other participant's username
    const otherParticipant = chatRoom.participants.find(p => p.userId !== currentUserId);
    return otherParticipant?.user?.username || 'Unknown User';
  }

  /**
   * Check if chat room is direct message between two specific users
   */
  static isDirectMessageBetween(chatRoom: ChatRoom, userId1: string, userId2: string, participants: ChatRoomParticipant[]): boolean {
    if (chatRoom.type !== CHAT_ROOM_TYPES.DIRECT) {
      return false;
    }

    if (participants.length !== 2) {
      return false;
    }

    const participantIds = participants.map(p => p.userId);
    return participantIds.includes(userId1) && participantIds.includes(userId2);
  }

  /**
   * Validate chat room access permissions
   */
  static validateAccess(chatRoom: ChatRoom, participants: ChatRoomParticipant[], userId: string, action: 'read' | 'write' | 'admin'): boolean {
    const participant = participants.find(p => p.userId === userId);
    
    if (!participant) {
      return false; // User is not a participant
    }

    switch (action) {
      case 'read':
      case 'write':
        return true; // All participants can read and write
      case 'admin':
        return participant.role === USER_ROLES.ADMIN;
      default:
        return false;
    }
  }
}