import { ChatRoomService } from '../chatroom/chatroom.service';
import { IChatRoomRepository } from '../chatroom/chatroom.repository';
import { MessageService } from '../message/message.service';
import { WebSocketService } from '../websocket/websocket.service';
import { GroupModel, CreateGroupData, UpdateGroupData, GroupMemberData, UpdateGroupMemberData } from './group.model';
import { GroupConverter } from './group.converter';
import { ApiResponse } from '../types';
import { ValidationUtils } from '../utils/validation';
import { CHAT_ROOM_TYPES, USER_ROLES } from '../config/constants';

/**
 * Group Service
 * Handles business logic for group chat operations including creation, management, and broadcasting
 */
export class GroupService {
  constructor(
    private readonly chatRoomService: ChatRoomService,
    private readonly messageService: MessageService,
    private readonly chatRoomRepository: IChatRoomRepository
  ) {}
  /**
   * Create a new group chat
   */
  async createGroup(data: CreateGroupData): Promise<ApiResponse> {
    try {
      // Validate group creation data
      const validation = GroupModel.validateCreateGroup(data);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        };
      }

      // Verify all participants exist
      const participantsExist = await this.chatRoomRepository.verifyUsersExist(validation.sanitizedData!.participantIds);
      if (!participantsExist) {
        return {
          success: false,
          error: 'One or more participants do not exist'
        };
      }

      // Create group chat using ChatRoomService
      const chatRoomData = {
        name: validation.sanitizedData!.name,
        type: CHAT_ROOM_TYPES.GROUP as any,
        createdBy: validation.sanitizedData!.createdBy,
        participantIds: validation.sanitizedData!.participantIds
      };

      const result = await this.chatRoomService.createChatRoom(chatRoomData);
      
      if (!result.success) {
        return result;
      }

      // Send group creation notifications to all participants
      const wsService = WebSocketService.getInstance();
      const groupData = result.data;
      
      for (const participantId of validation.sanitizedData!.participantIds) {
        if (participantId !== validation.sanitizedData!.createdBy) {
          await wsService.sendGroupNotification(groupData.id, {
            type: 'group_created',
            groupName: groupData.name,
            createdBy: validation.sanitizedData!.createdBy,
            message: `You have been added to the group "${groupData.name}"`
          });
        }
      }

      return {
        success: true,
        data: GroupConverter.toApiGroup(groupData),
        message: 'Group created successfully'
      };

    } catch (error) {
      console.error('Create group error:', error);
      return {
        success: false,
        error: 'Failed to create group'
      };
    }
  }

  /**
   * Add member to group
   */
  async addMember(
    groupId: string,
    memberData: GroupMemberData,
    userId: string
  ): Promise<ApiResponse> {
    try {
      // Validate group ID
      if (!ValidationUtils.isValidUUID(groupId)) {
        return {
          success: false,
          error: 'Invalid group ID format'
        };
      }

      // Validate member data
      const validation = GroupModel.validateGroupMember(memberData);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        };
      }

      // Check if user is admin
      const isAdmin = await this.chatRoomRepository.isUserAdmin(groupId, userId);
      if (!isAdmin) {
        return {
          success: false,
          error: 'Only group admins can add members'
        };
      }

      // Get group details
      const group = await this.chatRoomRepository.getChatRoomById(groupId);
      if (!group) {
        return {
          success: false,
          error: 'Group not found'
        };
      }

      if (group.type !== CHAT_ROOM_TYPES.GROUP) {
        return {
          success: false,
          error: 'This operation is only allowed for group chats'
        };
      }

      // Check if user is already a member
      const isAlreadyMember = await this.chatRoomRepository.isUserParticipant(
        groupId,
        validation.sanitizedData!.userId
      );

      if (isAlreadyMember) {
        return {
          success: false,
          error: 'User is already a group member'
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

      // Add member using ChatRoomService
      const participantData = {
        userId: validation.sanitizedData!.userId,
        role: validation.sanitizedData!.role || USER_ROLES.MEMBER
      };

      const result = await this.chatRoomService.addParticipant(groupId, participantData, userId);
      
      if (!result.success) {
        return result;
      }

      // Send group member addition notifications
      const wsService = WebSocketService.getInstance();
      const participants = await this.chatRoomRepository.getChatRoomParticipants(groupId);
      
      // Notify all existing members about new member
      for (const participant of participants) {
        if (participant.userId !== validation.sanitizedData!.userId) {
          await wsService.sendGroupNotification(groupId, {
            type: 'member_added',
            groupName: group.name,
            newMemberId: validation.sanitizedData!.userId,
            addedBy: userId,
            message: `A new member has been added to the group`
          });
        }
      }

      // Notify new member about being added
      await wsService.sendGroupNotification(groupId, {
        type: 'added_to_group',
        groupName: group.name,
        addedBy: userId,
        message: `You have been added to the group "${group.name}"`
      });

      return {
        success: true,
        data: GroupConverter.toApiGroupMember(result.data),
        message: 'Member added to group successfully'
      };

    } catch (error) {
      console.error('Add group member error:', error);
      return {
        success: false,
        error: 'Failed to add member to group'
      };
    }
  }

  /**
   * Remove member from group
   */
  async removeMember(
    groupId: string,
    memberUserId: string,
    userId: string
  ): Promise<ApiResponse> {
    try {
      // Validate IDs
      if (!ValidationUtils.isValidUUID(groupId) || !ValidationUtils.isValidUUID(memberUserId)) {
        return {
          success: false,
          error: 'Invalid ID format'
        };
      }

      // Get group details
      const group = await this.chatRoomRepository.getChatRoomById(groupId);
      if (!group) {
        return {
          success: false,
          error: 'Group not found'
        };
      }

      if (group.type !== CHAT_ROOM_TYPES.GROUP) {
        return {
          success: false,
          error: 'This operation is only allowed for group chats'
        };
      }

      // Check permissions: admin can remove anyone, users can remove themselves
      const isAdmin = await this.chatRoomRepository.isUserAdmin(groupId, userId);
      const isSelfRemoval = userId === memberUserId;

      if (!isAdmin && !isSelfRemoval) {
        return {
          success: false,
          error: 'Only group admins can remove other members'
        };
      }

      // Use ChatRoomService to remove participant
      const result = await this.chatRoomService.removeParticipant(groupId, memberUserId, userId);
      
      if (!result.success) {
        return result;
      }

      // Send group member removal notifications
      const wsService = WebSocketService.getInstance();
      const participants = await this.chatRoomRepository.getChatRoomParticipants(groupId);
      
      // Notify remaining members about member removal
      for (const participant of participants) {
        await wsService.sendGroupNotification(groupId, {
          type: 'member_removed',
          groupName: group.name,
          removedMemberId: memberUserId,
          removedBy: userId,
          isSelfRemoval,
          message: isSelfRemoval 
            ? `A member has left the group`
            : `A member has been removed from the group`
        });
      }

      // Notify removed member (if not self-removal)
      if (!isSelfRemoval) {
        await wsService.sendGroupNotification(groupId, {
          type: 'removed_from_group',
          groupName: group.name,
          removedBy: userId,
          message: `You have been removed from the group "${group.name}"`
        });
      }

      return {
        success: true,
        message: isSelfRemoval ? 'Left group successfully' : 'Member removed from group successfully'
      };

    } catch (error) {
      console.error('Remove group member error:', error);
      return {
        success: false,
        error: 'Failed to remove member from group'
      };
    }
  }

  /**
   * Update member role (admin/member)
   */
  async updateMemberRole(
    groupId: string,
    memberUserId: string,
    updateData: UpdateGroupMemberData,
    userId: string
  ): Promise<ApiResponse> {
    try {
      // Validate IDs
      if (!ValidationUtils.isValidUUID(groupId) || !ValidationUtils.isValidUUID(memberUserId)) {
        return {
          success: false,
          error: 'Invalid ID format'
        };
      }

      // Validate update data
      const validation = GroupModel.validateUpdateGroupMember(updateData);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        };
      }

      // Check if user is admin
      const isAdmin = await this.chatRoomRepository.isUserAdmin(groupId, userId);
      if (!isAdmin) {
        return {
          success: false,
          error: 'Only group admins can update member roles'
        };
      }

      // Get group details
      const group = await this.chatRoomRepository.getChatRoomById(groupId);
      if (!group) {
        return {
          success: false,
          error: 'Group not found'
        };
      }

      if (group.type !== CHAT_ROOM_TYPES.GROUP) {
        return {
          success: false,
          error: 'This operation is only allowed for group chats'
        };
      }

      // Use ChatRoomService to update participant role
      const participantUpdateData = {
        role: validation.sanitizedData!.role
      };

      const result = await this.chatRoomService.updateParticipantRole(
        groupId,
        memberUserId,
        participantUpdateData,
        userId
      );
      
      if (!result.success) {
        return result;
      }

      // Send role update notifications
      const wsService = WebSocketService.getInstance();
      const participants = await this.chatRoomRepository.getChatRoomParticipants(groupId);
      
      // Notify all members about role change
      for (const participant of participants) {
        await wsService.sendGroupNotification(groupId, {
          type: 'member_role_updated',
          groupName: group.name,
          memberId: memberUserId,
          newRole: validation.sanitizedData!.role,
          updatedBy: userId,
          message: `A member's role has been updated to ${validation.sanitizedData!.role}`
        });
      }

      return {
        success: true,
        data: GroupConverter.toApiGroupMember(result.data),
        message: 'Member role updated successfully'
      };

    } catch (error) {
      console.error('Update group member role error:', error);
      return {
        success: false,
        error: 'Failed to update member role'
      };
    }
  }

  /**
   * Update group settings (name, etc.)
   */
  async updateGroup(
    groupId: string,
    updateData: UpdateGroupData,
    userId: string
  ): Promise<ApiResponse> {
    try {
      // Validate group ID
      if (!ValidationUtils.isValidUUID(groupId)) {
        return {
          success: false,
          error: 'Invalid group ID format'
        };
      }

      // Validate update data
      const validation = GroupModel.validateUpdateGroup(updateData);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        };
      }

      // Check if user is admin
      const isAdmin = await this.chatRoomRepository.isUserAdmin(groupId, userId);
      if (!isAdmin) {
        return {
          success: false,
          error: 'Only group admins can update group settings'
        };
      }

      // Get group details
      const group = await this.chatRoomRepository.getChatRoomById(groupId);
      if (!group) {
        return {
          success: false,
          error: 'Group not found'
        };
      }

      if (group.type !== CHAT_ROOM_TYPES.GROUP) {
        return {
          success: false,
          error: 'This operation is only allowed for group chats'
        };
      }

      // Use ChatRoomService to update group
      const chatRoomUpdateData = {
        name: validation.sanitizedData!.name
      };

      const result = await this.chatRoomService.updateChatRoom(groupId, chatRoomUpdateData, userId);
      
      if (!result.success) {
        return result;
      }

      // Send group update notifications
      const wsService = WebSocketService.getInstance();
      const participants = await this.chatRoomRepository.getChatRoomParticipants(groupId);
      
      // Notify all members about group update
      for (const participant of participants) {
        if (participant.userId !== userId) {
          await wsService.sendGroupNotification(groupId, {
            type: 'group_updated',
            groupName: validation.sanitizedData!.name,
            updatedBy: userId,
            changes: updateData,
            message: `Group settings have been updated`
          });
        }
      }

      return {
        success: true,
        data: GroupConverter.toApiGroup(result.data),
        message: 'Group updated successfully'
      };

    } catch (error) {
      console.error('Update group error:', error);
      return {
        success: false,
        error: 'Failed to update group'
      };
    }
  }

  /**
   * Broadcast message to all group members
   */
  async broadcastMessage(
    groupId: string,
    messageContent: string,
    senderId: string
  ): Promise<ApiResponse> {
    try {
      // Validate inputs
      if (!ValidationUtils.isValidUUID(groupId)) {
        return {
          success: false,
          error: 'Invalid group ID format'
        };
      }

      if (!ValidationUtils.isValidUUID(senderId)) {
        return {
          success: false,
          error: 'Invalid sender ID format'
        };
      }

      if (!messageContent || messageContent.trim().length === 0) {
        return {
          success: false,
          error: 'Message content cannot be empty'
        };
      }

      // Check if sender is a group member
      const isParticipant = await this.chatRoomRepository.isUserParticipant(groupId, senderId);
      if (!isParticipant) {
        return {
          success: false,
          error: 'User is not a member of this group'
        };
      }

      // Get group details
      const group = await this.chatRoomRepository.getChatRoomById(groupId);
      if (!group) {
        return {
          success: false,
          error: 'Group not found'
        };
      }

      if (group.type !== CHAT_ROOM_TYPES.GROUP) {
        return {
          success: false,
          error: 'This operation is only allowed for group chats'
        };
      }

      // Send message using MessageService (which handles broadcasting)
      const messageData = {
        content: messageContent.trim(),
        senderId,
        chatRoomId: groupId
      };

      const result = await this.messageService.sendMessage(messageData);
      
      if (!result.success) {
        return result;
      }

      return {
        success: true,
        data: result.data,
        message: 'Message broadcasted to group successfully'
      };

    } catch (error) {
      console.error('Broadcast group message error:', error);
      return {
        success: false,
        error: 'Failed to broadcast message to group'
      };
    }
  }

  /**
   * Get group details with members
   */
  async getGroupDetails(groupId: string, userId: string): Promise<ApiResponse> {
    try {
      // Validate group ID
      if (!ValidationUtils.isValidUUID(groupId)) {
        return {
          success: false,
          error: 'Invalid group ID format'
        };
      }

      // Check if user is a group member
      const isParticipant = await this.chatRoomRepository.isUserParticipant(groupId, userId);
      if (!isParticipant) {
        return {
          success: false,
          error: 'User is not a member of this group'
        };
      }

      // Get group details using ChatRoomService
      const result = await this.chatRoomService.getChatRoomById(groupId, userId);
      
      if (!result.success) {
        return result;
      }

      // Ensure it's a group chat
      if (result.data.type !== CHAT_ROOM_TYPES.GROUP) {
        return {
          success: false,
          error: 'This is not a group chat'
        };
      }

      return {
        success: true,
        data: GroupConverter.toApiGroup(result.data)
      };

    } catch (error) {
      console.error('Get group details error:', error);
      return {
        success: false,
        error: 'Failed to get group details'
      };
    }
  }

  /**
   * Get user's groups
   */
  async getUserGroups(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<ApiResponse> {
    try {
      // Get user's chat rooms
      const result = await this.chatRoomService.getUserChatRooms(userId, limit, offset);
      
      if (!result.success) {
        return result;
      }

      // Filter only group chats
      const groups = result.data.chatRooms.filter((chatRoom: any) => 
        chatRoom.type === CHAT_ROOM_TYPES.GROUP
      );

      // Convert to group format
      const apiGroups = groups.map((group: any) => GroupConverter.toApiGroup(group));

      return {
        success: true,
        data: {
          groups: apiGroups,
          pagination: {
            limit,
            offset,
            hasMore: groups.length === limit
          }
        }
      };

    } catch (error) {
      console.error('Get user groups error:', error);
      return {
        success: false,
        error: 'Failed to get user groups'
      };
    }
  }

  /**
   * Leave group (same as remove member for self)
   */
  async leaveGroup(groupId: string, userId: string): Promise<ApiResponse> {
    return await this.removeMember(groupId, userId, userId);
  }

  /**
   * Delete group (only creator or admin can delete)
   */
  async deleteGroup(groupId: string, userId: string): Promise<ApiResponse> {
    try {
      // Validate group ID
      if (!ValidationUtils.isValidUUID(groupId)) {
        return {
          success: false,
          error: 'Invalid group ID format'
        };
      }

      // Get group details
      const group = await this.chatRoomRepository.getChatRoomById(groupId);
      if (!group) {
        return {
          success: false,
          error: 'Group not found'
        };
      }

      if (group.type !== CHAT_ROOM_TYPES.GROUP) {
        return {
          success: false,
          error: 'This operation is only allowed for group chats'
        };
      }

      // Check if user is admin or creator
      const isAdmin = await this.chatRoomRepository.isUserAdmin(groupId, userId);
      const isCreator = group.createdBy === userId;

      if (!isAdmin && !isCreator) {
        return {
          success: false,
          error: 'Only group admins or creators can delete groups'
        };
      }

      // Get participants before deletion for notifications
      const participants = await this.chatRoomRepository.getChatRoomParticipants(groupId);

      // Send group deletion notifications
      const wsService = WebSocketService.getInstance();
      for (const participant of participants) {
        if (participant.userId !== userId) {
          await wsService.sendGroupNotification(groupId, {
            type: 'group_deleted',
            groupName: group.name,
            deletedBy: userId,
            message: `The group "${group.name}" has been deleted`
          });
        }
      }

      // Use ChatRoomService to delete group
      const result = await this.chatRoomService.deleteChatRoom(groupId, userId);
      
      return result;

    } catch (error) {
      console.error('Delete group error:', error);
      return {
        success: false,
        error: 'Failed to delete group'
      };
    }
  }

  /**
   * Get group statistics
   */
  async getGroupStatistics(groupId: string, userId: string): Promise<ApiResponse> {
    try {
      // Validate group ID
      if (!ValidationUtils.isValidUUID(groupId)) {
        return {
          success: false,
          error: 'Invalid group ID format'
        };
      }

      // Check if user is a group member
      const isParticipant = await this.chatRoomRepository.isUserParticipant(groupId, userId);
      if (!isParticipant) {
        return {
          success: false,
          error: 'User is not a member of this group'
        };
      }

      // Get group details
      const group = await this.chatRoomRepository.getChatRoomById(groupId);
      if (!group) {
        return {
          success: false,
          error: 'Group not found'
        };
      }

      if (group.type !== CHAT_ROOM_TYPES.GROUP) {
        return {
          success: false,
          error: 'This operation is only allowed for group chats'
        };
      }

      // Get statistics
      const stats = await this.chatRoomRepository.getChatRoomStatistics(groupId);

      return {
        success: true,
        data: {
          groupId,
          groupName: group.name,
          memberCount: stats.participantCount,
          messageCount: stats.messageCount,
          adminCount: stats.adminCount,
          createdAt: stats.createdAt,
          lastActivity: stats.lastActivity
        }
      };

    } catch (error) {
      console.error('Get group statistics error:', error);
      return {
        success: false,
        error: 'Failed to get group statistics'
      };
    }
  }
}