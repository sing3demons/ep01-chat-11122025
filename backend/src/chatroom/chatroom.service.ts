import { ChatRoomRepository, IChatRoomRepository } from './chatroom.repository';
import { ChatRoomModel, CreateChatRoomData, UpdateChatRoomData, AddParticipantData, UpdateParticipantData } from './chatroom.model';
import { ChatRoomConverter } from './chatroom.converter';
import { ApiResponse } from '../types';
import { ValidationUtils } from '../utils/validation';
import { CHAT_ROOM_TYPES, USER_ROLES } from '../config/constants';

/**
 * ChatRoom Service
 * Handles business logic for chat room operations
 */
export class ChatRoomService {
  constructor(private readonly chatRoomRepository: IChatRoomRepository) {}
  /**
   * Create a new chat room
   */
  async createChatRoom(data: CreateChatRoomData): Promise<ApiResponse> {
    try {
      // Validate chat room data
      const validation = ChatRoomModel.validateCreateChatRoom(data);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        };
      }

      // For direct chats, check if one already exists between these users
      if (validation.sanitizedData!.type === CHAT_ROOM_TYPES.DIRECT) {
        const existingDirectChat = await this.chatRoomRepository.findDirectChatBetweenUsers(
          validation.sanitizedData!.participantIds[0],
          validation.sanitizedData!.participantIds[1]
        );

        if (existingDirectChat) {
          // Return existing chat room
          const chatRoomWithDetails = await this.chatRoomRepository.getChatRoomByIdWithDetails(existingDirectChat.id);
          const apiChatRoom = ChatRoomConverter.toApiChatRoomWithDetails(chatRoomWithDetails!);

          return {
            success: true,
            data: apiChatRoom,
            message: 'Direct chat already exists'
          };
        }
      }

      // Verify all participants exist
      const participantsExist = await this.chatRoomRepository.verifyUsersExist(validation.sanitizedData!.participantIds);
      if (!participantsExist) {
        return {
          success: false,
          error: 'One or more participants do not exist'
        };
      }

      // Create chat room
      const chatRoom = await this.chatRoomRepository.createChatRoom(validation.sanitizedData!);

      // Get chat room with details
      const chatRoomWithDetails = await this.chatRoomRepository.getChatRoomByIdWithDetails(chatRoom.id);

      // Convert to API format
      const apiChatRoom = ChatRoomConverter.toApiChatRoomWithDetails(chatRoomWithDetails!);

      return {
        success: true,
        data: apiChatRoom,
        message: 'Chat room created successfully'
      };

    } catch (error) {
      console.error('Create chat room error:', error);
      return {
        success: false,
        error: 'Failed to create chat room'
      };
    }
  }

  /**
   * Get chat room by ID
   */
  async getChatRoomById(chatRoomId: string, userId: string): Promise<ApiResponse> {
    try {
      // Validate chat room ID
      if (!ValidationUtils.isValidUUID(chatRoomId)) {
        return {
          success: false,
          error: 'Invalid chat room ID format'
        };
      }

      // Check if user is participant
      const isParticipant = await this.chatRoomRepository.isUserParticipant(chatRoomId, userId);
      if (!isParticipant) {
        return {
          success: false,
          error: 'User is not a participant in this chat room'
        };
      }

      // Get chat room with details
      const chatRoom = await this.chatRoomRepository.getChatRoomByIdWithDetails(chatRoomId);

      if (!chatRoom) {
        return {
          success: false,
          error: 'Chat room not found'
        };
      }

      // Convert to API format
      const apiChatRoom = ChatRoomConverter.toApiChatRoomWithDetails(chatRoom);

      return {
        success: true,
        data: apiChatRoom
      };

    } catch (error) {
      console.error('Get chat room by ID error:', error);
      return {
        success: false,
        error: 'Failed to get chat room'
      };
    }
  }

  /**
   * Get user's chat rooms
   */
  async getUserChatRooms(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<ApiResponse> {
    try {
      // Validate pagination
      if (limit < 1 || limit > 100) {
        return {
          success: false,
          error: 'Limit must be between 1 and 100'
        };
      }

      if (offset < 0) {
        return {
          success: false,
          error: 'Offset must be non-negative'
        };
      }

      // Get user's chat rooms
      const chatRooms = await this.chatRoomRepository.getUserChatRooms(userId, limit, offset);

      // Convert to API format
      const apiChatRooms = chatRooms.map(chatRoom => 
        ChatRoomConverter.toApiChatRoomWithDetails(chatRoom)
      );

      return {
        success: true,
        data: {
          chatRooms: apiChatRooms,
          pagination: {
            limit,
            offset,
            hasMore: chatRooms.length === limit
          }
        }
      };

    } catch (error) {
      console.error('Get user chat rooms error:', error);
      return {
        success: false,
        error: 'Failed to get chat rooms'
      };
    }
  }

  /**
   * Update chat room
   */
  async updateChatRoom(
    chatRoomId: string,
    updateData: UpdateChatRoomData,
    userId: string
  ): Promise<ApiResponse> {
    try {
      // Validate chat room ID
      if (!ValidationUtils.isValidUUID(chatRoomId)) {
        return {
          success: false,
          error: 'Invalid chat room ID format'
        };
      }

      // Validate update data
      const validation = ChatRoomModel.validateUpdateChatRoom(updateData);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        };
      }

      // Check if user is admin
      const isAdmin = await this.chatRoomRepository.isUserAdmin(chatRoomId, userId);
      if (!isAdmin) {
        return {
          success: false,
          error: 'Only admins can update chat room settings'
        };
      }

      // Get existing chat room
      const existingChatRoom = await this.chatRoomRepository.getChatRoomById(chatRoomId);
      if (!existingChatRoom) {
        return {
          success: false,
          error: 'Chat room not found'
        };
      }

      // Direct chats cannot be renamed
      if (existingChatRoom.type === CHAT_ROOM_TYPES.DIRECT && validation.sanitizedData?.name) {
        return {
          success: false,
          error: 'Direct chats cannot be renamed'
        };
      }

      // Update chat room
      const updatedChatRoom = await this.chatRoomRepository.updateChatRoom(chatRoomId, validation.sanitizedData!);

      // Get updated chat room with details
      const chatRoomWithDetails = await this.chatRoomRepository.getChatRoomByIdWithDetails(chatRoomId);

      // Convert to API format
      const apiChatRoom = ChatRoomConverter.toApiChatRoomWithDetails(chatRoomWithDetails!);

      return {
        success: true,
        data: apiChatRoom,
        message: 'Chat room updated successfully'
      };

    } catch (error) {
      console.error('Update chat room error:', error);
      return {
        success: false,
        error: 'Failed to update chat room'
      };
    }
  }

  /**
   * Delete chat room
   */
  async deleteChatRoom(chatRoomId: string, userId: string): Promise<ApiResponse> {
    try {
      // Validate chat room ID
      if (!ValidationUtils.isValidUUID(chatRoomId)) {
        return {
          success: false,
          error: 'Invalid chat room ID format'
        };
      }

      // Check if user is admin or creator
      const chatRoom = await this.chatRoomRepository.getChatRoomById(chatRoomId);
      if (!chatRoom) {
        return {
          success: false,
          error: 'Chat room not found'
        };
      }

      const isAdmin = await this.chatRoomRepository.isUserAdmin(chatRoomId, userId);
      const isCreator = chatRoom.createdBy === userId;

      if (!isAdmin && !isCreator) {
        return {
          success: false,
          error: 'Only admins or creators can delete chat rooms'
        };
      }

      // Delete chat room (this will cascade delete participants and messages)
      await this.chatRoomRepository.deleteChatRoom(chatRoomId);

      return {
        success: true,
        message: 'Chat room deleted successfully'
      };

    } catch (error) {
      console.error('Delete chat room error:', error);
      return {
        success: false,
        error: 'Failed to delete chat room'
      };
    }
  }

  /**
   * Add participant to chat room
   */
  async addParticipant(
    chatRoomId: string,
    participantData: AddParticipantData,
    userId: string
  ): Promise<ApiResponse> {
    try {
      // Validate chat room ID
      if (!ValidationUtils.isValidUUID(chatRoomId)) {
        return {
          success: false,
          error: 'Invalid chat room ID format'
        };
      }

      // Validate participant data
      const validation = ChatRoomModel.validateAddParticipant(participantData);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        };
      }

      // Check if user is admin
      const isAdmin = await this.chatRoomRepository.isUserAdmin(chatRoomId, userId);
      if (!isAdmin) {
        return {
          success: false,
          error: 'Only admins can add participants'
        };
      }

      // Get chat room
      const chatRoom = await this.chatRoomRepository.getChatRoomById(chatRoomId);
      if (!chatRoom) {
        return {
          success: false,
          error: 'Chat room not found'
        };
      }

      // Cannot add participants to direct chats
      if (chatRoom.type === CHAT_ROOM_TYPES.DIRECT) {
        return {
          success: false,
          error: 'Cannot add participants to direct chats'
        };
      }

      // Check if user is already a participant
      const isAlreadyParticipant = await this.chatRoomRepository.isUserParticipant(
        chatRoomId,
        validation.sanitizedData!.userId
      );

      if (isAlreadyParticipant) {
        return {
          success: false,
          error: 'User is already a participant'
        };
      }

      // Verify user exists
      const userExists = await this.chatRoomRepository.verifyUsersExist([validation.sanitizedData!.userId]);
      if (!userExists) {
        return {
          success: false,
          error: 'User does not exist'
        };
      }

      // Add participant
      const participant = await this.chatRoomRepository.addParticipant(chatRoomId, validation.sanitizedData!);

      // Convert to API format
      const apiParticipant = ChatRoomConverter.toApiChatRoomParticipant(participant);

      return {
        success: true,
        data: apiParticipant,
        message: 'Participant added successfully'
      };

    } catch (error) {
      console.error('Add participant error:', error);
      return {
        success: false,
        error: 'Failed to add participant'
      };
    }
  }

  /**
   * Remove participant from chat room
   */
  async removeParticipant(
    chatRoomId: string,
    participantUserId: string,
    userId: string
  ): Promise<ApiResponse> {
    try {
      // Validate IDs
      if (!ValidationUtils.isValidUUID(chatRoomId) || !ValidationUtils.isValidUUID(participantUserId)) {
        return {
          success: false,
          error: 'Invalid ID format'
        };
      }

      // Get chat room
      const chatRoom = await this.chatRoomRepository.getChatRoomById(chatRoomId);
      if (!chatRoom) {
        return {
          success: false,
          error: 'Chat room not found'
        };
      }

      // Cannot remove participants from direct chats
      if (chatRoom.type === CHAT_ROOM_TYPES.DIRECT) {
        return {
          success: false,
          error: 'Cannot remove participants from direct chats'
        };
      }

      // Check permissions: admin can remove anyone, users can remove themselves
      const isAdmin = await this.chatRoomRepository.isUserAdmin(chatRoomId, userId);
      const isSelfRemoval = userId === participantUserId;

      if (!isAdmin && !isSelfRemoval) {
        return {
          success: false,
          error: 'Only admins can remove other participants'
        };
      }

      // Get all participants to check removal constraints
      const participants = await this.chatRoomRepository.getChatRoomParticipants(chatRoomId);

      // Check if removal is allowed (must maintain at least one admin)
      const apiParticipants = participants.map(p => ({
        chatRoomId: p.chatRoomId,
        userId: p.userId,
        role: p.role as any,
        joinedAt: p.joinedAt,
        user: p.user ? {
          id: p.user.id,
          username: p.user.username,
          isOnline: p.user.isOnline,
          lastSeen: p.user.lastSeen
        } : undefined
      }));
      const canRemove = ChatRoomModel.canRemoveParticipant(apiParticipants, participantUserId);
      if (!canRemove) {
        return {
          success: false,
          error: 'Cannot remove the last admin from the chat room'
        };
      }

      // Remove participant
      await this.chatRoomRepository.removeParticipant(chatRoomId, participantUserId);

      return {
        success: true,
        message: 'Participant removed successfully'
      };

    } catch (error) {
      console.error('Remove participant error:', error);
      return {
        success: false,
        error: 'Failed to remove participant'
      };
    }
  }

  /**
   * Update participant role
   */
  async updateParticipantRole(
    chatRoomId: string,
    participantUserId: string,
    updateData: UpdateParticipantData,
    userId: string
  ): Promise<ApiResponse> {
    try {
      // Validate IDs
      if (!ValidationUtils.isValidUUID(chatRoomId) || !ValidationUtils.isValidUUID(participantUserId)) {
        return {
          success: false,
          error: 'Invalid ID format'
        };
      }

      // Validate update data
      const validation = ChatRoomModel.validateUpdateParticipant(updateData);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        };
      }

      // Check if user is admin
      const isAdmin = await this.chatRoomRepository.isUserAdmin(chatRoomId, userId);
      if (!isAdmin) {
        return {
          success: false,
          error: 'Only admins can update participant roles'
        };
      }

      // Get chat room
      const chatRoom = await this.chatRoomRepository.getChatRoomById(chatRoomId);
      if (!chatRoom) {
        return {
          success: false,
          error: 'Chat room not found'
        };
      }

      // Cannot change roles in direct chats
      if (chatRoom.type === CHAT_ROOM_TYPES.DIRECT) {
        return {
          success: false,
          error: 'Cannot change roles in direct chats'
        };
      }

      // Get current participant
      const currentParticipant = await this.chatRoomRepository.getParticipant(chatRoomId, participantUserId);
      if (!currentParticipant) {
        return {
          success: false,
          error: 'Participant not found'
        };
      }

      // If demoting an admin, ensure at least one admin remains
      if (currentParticipant.role === USER_ROLES.ADMIN && validation.sanitizedData!.role === USER_ROLES.MEMBER) {
        const participants = await this.chatRoomRepository.getChatRoomParticipants(chatRoomId);
        const apiParticipants = participants.map(p => ({
          chatRoomId: p.chatRoomId,
          userId: p.userId,
          role: p.role as any,
          joinedAt: p.joinedAt,
          user: p.user ? {
            id: p.user.id,
            username: p.user.username,
            isOnline: p.user.isOnline,
            lastSeen: p.user.lastSeen
          } : undefined
        }));
        const adminCount = ChatRoomModel.getAdminCount(apiParticipants);
        
        if (adminCount <= 1) {
          return {
            success: false,
            error: 'Cannot demote the last admin'
          };
        }
      }

      // Update participant role
      const updatedParticipant = await this.chatRoomRepository.updateParticipantRole(
        chatRoomId,
        participantUserId,
        validation.sanitizedData!.role!
      );

      // Convert to API format
      const apiParticipant = ChatRoomConverter.toApiChatRoomParticipant(updatedParticipant);

      return {
        success: true,
        data: apiParticipant,
        message: 'Participant role updated successfully'
      };

    } catch (error) {
      console.error('Update participant role error:', error);
      return {
        success: false,
        error: 'Failed to update participant role'
      };
    }
  }

  /**
   * Leave chat room
   */
  async leaveChatRoom(chatRoomId: string, userId: string): Promise<ApiResponse> {
    try {
      // Validate chat room ID
      if (!ValidationUtils.isValidUUID(chatRoomId)) {
        return {
          success: false,
          error: 'Invalid chat room ID format'
        };
      }

      // Get chat room
      const chatRoom = await this.chatRoomRepository.getChatRoomById(chatRoomId);
      if (!chatRoom) {
        return {
          success: false,
          error: 'Chat room not found'
        };
      }

      // Cannot leave direct chats (they should be deleted instead)
      if (chatRoom.type === CHAT_ROOM_TYPES.DIRECT) {
        return {
          success: false,
          error: 'Cannot leave direct chats'
        };
      }

      // Check if user is participant
      const isParticipant = await this.chatRoomRepository.isUserParticipant(chatRoomId, userId);
      if (!isParticipant) {
        return {
          success: false,
          error: 'User is not a participant in this chat room'
        };
      }

      // Get all participants to check constraints
      const participants = await this.chatRoomRepository.getChatRoomParticipants(chatRoomId);

      // Check if user can leave (must maintain at least one admin)
      const apiParticipants = participants.map(p => ({
        chatRoomId: p.chatRoomId,
        userId: p.userId,
        role: p.role as any,
        joinedAt: p.joinedAt,
        user: p.user ? {
          id: p.user.id,
          username: p.user.username,
          isOnline: p.user.isOnline,
          lastSeen: p.user.lastSeen
        } : undefined
      }));
      const canLeave = ChatRoomModel.canRemoveParticipant(apiParticipants, userId);
      if (!canLeave) {
        return {
          success: false,
          error: 'Cannot leave as the last admin. Promote another member to admin first.'
        };
      }

      // Remove user from chat room
      await this.chatRoomRepository.removeParticipant(chatRoomId, userId);

      return {
        success: true,
        message: 'Left chat room successfully'
      };

    } catch (error) {
      console.error('Leave chat room error:', error);
      return {
        success: false,
        error: 'Failed to leave chat room'
      };
    }
  }

  /**
   * Hide chat room for user (soft delete from user's view)
   * This implements chat deletion with proper isolation - removes chat from user's view
   * while preserving it for other participants
   */
  async hideChatRoom(chatRoomId: string, userId: string): Promise<ApiResponse> {
    try {
      // Validate chat room ID
      if (!ValidationUtils.isValidUUID(chatRoomId)) {
        return {
          success: false,
          error: 'Invalid chat room ID format'
        };
      }

      // Check if user is participant
      const isParticipant = await this.chatRoomRepository.isUserParticipant(chatRoomId, userId);
      if (!isParticipant) {
        return {
          success: false,
          error: 'User is not a participant in this chat room'
        };
      }

      // Hide chat room for user
      await this.chatRoomRepository.hideChatRoomForUser(chatRoomId, userId);

      return {
        success: true,
        message: 'Chat hidden successfully'
      };

    } catch (error) {
      console.error('Hide chat room error:', error);
      return {
        success: false,
        error: 'Failed to hide chat room'
      };
    }
  }

  /**
   * Unhide chat room for user
   */
  async unhideChatRoom(chatRoomId: string, userId: string): Promise<ApiResponse> {
    try {
      // Validate chat room ID
      if (!ValidationUtils.isValidUUID(chatRoomId)) {
        return {
          success: false,
          error: 'Invalid chat room ID format'
        };
      }

      // Check if user is participant
      const isParticipant = await this.chatRoomRepository.isUserParticipant(chatRoomId, userId);
      if (!isParticipant) {
        return {
          success: false,
          error: 'User is not a participant in this chat room'
        };
      }

      // Unhide chat room for user
      await this.chatRoomRepository.unhideChatRoomForUser(chatRoomId, userId);

      return {
        success: true,
        message: 'Chat unhidden successfully'
      };

    } catch (error) {
      console.error('Unhide chat room error:', error);
      return {
        success: false,
        error: 'Failed to unhide chat room'
      };
    }
  }

  /**
   * Get user's hidden chat rooms
   */
  async getUserHiddenChatRooms(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<ApiResponse> {
    try {
      // Validate pagination
      if (limit < 1 || limit > 100) {
        return {
          success: false,
          error: 'Limit must be between 1 and 100'
        };
      }

      if (offset < 0) {
        return {
          success: false,
          error: 'Offset must be non-negative'
        };
      }

      // Get user's hidden chat rooms
      const hiddenChatRooms = await this.chatRoomRepository.getUserHiddenChatRooms(userId, limit, offset);

      // Convert to API format
      const apiChatRooms = hiddenChatRooms.map(chatRoom => 
        ChatRoomConverter.toApiChatRoomWithDetails(chatRoom)
      );

      return {
        success: true,
        data: {
          chatRooms: apiChatRooms,
          pagination: {
            limit,
            offset,
            hasMore: hiddenChatRooms.length === limit
          }
        }
      };

    } catch (error) {
      console.error('Get user hidden chat rooms error:', error);
      return {
        success: false,
        error: 'Failed to get hidden chat rooms'
      };
    }
  }
}