import { Group, GroupMember } from './group.model';
import { CHAT_ROOM_TYPES } from '../config/constants';

/**
 * Group Converter
 * Handles conversion between database models and API responses for groups
 */
export class GroupConverter {
  /**
   * Convert chat room data to API group format
   */
  static toApiGroup(chatRoomData: any): Group {
    return {
      id: chatRoomData.id,
      name: chatRoomData.name || 'Unnamed Group',
      type: 'group',
      createdBy: chatRoomData.createdBy,
      createdAt: chatRoomData.createdAt,
      lastMessageAt: chatRoomData.lastMessageAt,
      memberCount: chatRoomData.participantCount || chatRoomData.participants?.length || 0,
      members: chatRoomData.participants ? 
        chatRoomData.participants.map((p: any) => this.toApiGroupMember(p)) : [],
      lastMessage: chatRoomData.messages && chatRoomData.messages.length > 0 ? {
        id: chatRoomData.messages[0].id,
        content: chatRoomData.messages[0].content,
        senderId: chatRoomData.messages[0].senderId,
        senderUsername: chatRoomData.messages[0].sender?.username || 'Unknown',
        createdAt: chatRoomData.messages[0].createdAt
      } : undefined
    };
  }

  /**
   * Convert participant data to API group member format
   */
  static toApiGroupMember(participantData: any): GroupMember {
    return {
      groupId: participantData.chatRoomId,
      userId: participantData.userId,
      role: participantData.role as 'admin' | 'member',
      joinedAt: participantData.joinedAt,
      user: participantData.user ? {
        id: participantData.user.id,
        username: participantData.user.username,
        isOnline: participantData.user.isOnline,
        lastSeen: participantData.user.lastSeen
      } : undefined
    };
  }

  /**
   * Convert API group data to chat room creation format
   */
  static toCreateChatRoomData(groupData: any): any {
    return {
      name: groupData.name,
      type: CHAT_ROOM_TYPES.GROUP,
      createdBy: groupData.createdBy,
      participantIds: groupData.participantIds
    };
  }

  /**
   * Convert API group member data to participant format
   */
  static toParticipantData(memberData: any): any {
    return {
      userId: memberData.userId,
      role: memberData.role
    };
  }

  /**
   * Convert group list for API response
   */
  static toApiGroupList(chatRooms: any[]): Group[] {
    return chatRooms
      .filter(chatRoom => chatRoom.type === CHAT_ROOM_TYPES.GROUP)
      .map(chatRoom => this.toApiGroup(chatRoom));
  }

  /**
   * Convert group summary for notifications
   */
  static toGroupNotificationData(groupData: any): any {
    return {
      id: groupData.id,
      name: groupData.name || 'Unnamed Group',
      memberCount: groupData.memberCount || groupData.participants?.length || 0,
      createdBy: groupData.createdBy,
      createdAt: groupData.createdAt
    };
  }

  /**
   * Convert group member list for API response
   */
  static toApiGroupMemberList(participants: any[]): GroupMember[] {
    return participants.map(participant => this.toApiGroupMember(participant));
  }

  /**
   * Convert group statistics for API response
   */
  static toApiGroupStatistics(stats: any, groupData: any): any {
    return {
      groupId: groupData.id,
      groupName: groupData.name || 'Unnamed Group',
      memberCount: stats.participantCount,
      messageCount: stats.messageCount,
      adminCount: stats.adminCount,
      createdAt: stats.createdAt,
      lastActivity: stats.lastActivity,
      type: 'group'
    };
  }

  /**
   * Convert group for search results
   */
  static toApiGroupSearchResult(chatRoomData: any): any {
    return {
      id: chatRoomData.id,
      name: chatRoomData.name || 'Unnamed Group',
      type: 'group',
      memberCount: chatRoomData.participantCount || chatRoomData.participants?.length || 0,
      lastActivity: chatRoomData.lastMessageAt,
      createdAt: chatRoomData.createdAt
    };
  }

  /**
   * Convert group member for role update response
   */
  static toApiGroupMemberUpdate(participantData: any): any {
    return {
      groupId: participantData.chatRoomId,
      userId: participantData.userId,
      role: participantData.role,
      joinedAt: participantData.joinedAt,
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Convert minimal group info for chat list
   */
  static toApiGroupChatListItem(chatRoomData: any): any {
    return {
      id: chatRoomData.id,
      name: chatRoomData.name || 'Unnamed Group',
      type: 'group',
      memberCount: chatRoomData.participantCount || chatRoomData.participants?.length || 0,
      lastMessage: chatRoomData.messages && chatRoomData.messages.length > 0 ? {
        content: this.truncateMessageForPreview(chatRoomData.messages[0].content),
        senderName: chatRoomData.messages[0].sender?.username || 'Unknown',
        timestamp: chatRoomData.messages[0].createdAt
      } : null,
      lastMessageAt: chatRoomData.lastMessageAt,
      unreadCount: chatRoomData.unreadCount || 0
    };
  }

  /**
   * Truncate message content for preview
   */
  private static truncateMessageForPreview(content: string, maxLength: number = 50): string {
    if (!content) return '';
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  }

  /**
   * Convert group activity for real-time notifications
   */
  static toGroupActivityNotification(activity: any): any {
    return {
      type: activity.type,
      groupId: activity.groupId,
      groupName: activity.groupName,
      actorId: activity.actorId,
      targetId: activity.targetId,
      message: activity.message,
      timestamp: new Date().toISOString(),
      data: activity.data || {}
    };
  }

  /**
   * Convert group invitation data
   */
  static toGroupInvitationData(groupData: any, inviterId: string, inviteeId: string): any {
    return {
      groupId: groupData.id,
      groupName: groupData.name || 'Unnamed Group',
      inviterId,
      inviteeId,
      memberCount: groupData.memberCount || 0,
      createdAt: new Date().toISOString()
    };
  }
}