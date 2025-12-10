import { 
  ChatRoom as PrismaChatRoom, 
  ChatRoomParticipant as PrismaChatRoomParticipant,
  User as PrismaUser,
  Message as PrismaMessage
} from '@prisma/client';

import { 
  ChatRoom, 
  ChatRoomWithParticipants, 
  ChatRoomWithDetails, 
  ChatRoomParticipant, 
  ChatRoomType, 
  ParticipantRole 
} from './chatroom.model';

/**
 * ChatRoom model converters
 */
export class ChatRoomConverter {
  /**
   * Convert Prisma ChatRoom to API ChatRoom
   */
  static toApiChatRoom(prismaChatRoom: PrismaChatRoom): ChatRoom {
    return {
      id: prismaChatRoom.id,
      name: prismaChatRoom.name || undefined,
      type: prismaChatRoom.type as ChatRoomType,
      createdBy: prismaChatRoom.createdBy,
      createdAt: prismaChatRoom.createdAt,
      lastMessageAt: prismaChatRoom.lastMessageAt,
    };
  }

  /**
   * Convert Prisma ChatRoomParticipant to API format
   */
  static toApiParticipant(
    prismaParticipant: PrismaChatRoomParticipant & { 
      user?: PrismaUser 
    }
  ): ChatRoomParticipant {
    return {
      chatRoomId: prismaParticipant.chatRoomId,
      userId: prismaParticipant.userId,
      role: prismaParticipant.role as ParticipantRole,
      joinedAt: prismaParticipant.joinedAt,
      user: prismaParticipant.user ? {
        id: prismaParticipant.user.id,
        username: prismaParticipant.user.username,
        isOnline: prismaParticipant.user.isOnline,
        lastSeen: prismaParticipant.user.lastSeen,
      } : undefined,
    };
  }

  /**
   * Convert Prisma ChatRoom with participants to API format
   */
  static toApiChatRoomWithParticipants(
    prismaChatRoom: PrismaChatRoom & {
      participants: (PrismaChatRoomParticipant & { user: PrismaUser })[];
    }
  ): ChatRoomWithParticipants {
    const chatRoom = this.toApiChatRoom(prismaChatRoom);
    
    return {
      ...chatRoom,
      participants: prismaChatRoom.participants.map(p => this.toApiParticipant(p)),
    };
  }

  /**
   * Convert Prisma ChatRoomParticipant to API format
   */
  static toApiChatRoomParticipant(
    prismaParticipant: PrismaChatRoomParticipant & { user?: PrismaUser }
  ): ChatRoomParticipant {
    return {
      chatRoomId: prismaParticipant.chatRoomId,
      userId: prismaParticipant.userId,
      role: prismaParticipant.role as ParticipantRole,
      joinedAt: prismaParticipant.joinedAt,
      user: prismaParticipant.user ? {
        id: prismaParticipant.user.id,
        username: prismaParticipant.user.username,
        isOnline: prismaParticipant.user.isOnline,
        lastSeen: prismaParticipant.user.lastSeen
      } : undefined
    };
  }

  /**
   * Convert Prisma ChatRoom with full details to API format
   */
  static toApiChatRoomWithDetails(
    prismaChatRoom: PrismaChatRoom & {
      participants: (PrismaChatRoomParticipant & { user: PrismaUser })[];
      messages?: (PrismaMessage & { sender: PrismaUser })[];
    }
  ): ChatRoomWithDetails {
    const chatRoomWithParticipants = this.toApiChatRoomWithParticipants(prismaChatRoom);
    
    // Get the latest message if available
    const latestMessage = prismaChatRoom.messages?.[0];
    
    return {
      ...chatRoomWithParticipants,
      participantCount: prismaChatRoom.participants.length,
      lastMessage: latestMessage ? {
        id: latestMessage.id,
        content: latestMessage.content,
        senderId: latestMessage.senderId,
        senderUsername: latestMessage.sender.username,
        createdAt: latestMessage.createdAt,
      } : undefined,
    };
  }

  /**
   * Convert API ChatRoom to Prisma format
   */
  static toPrismaChatRoom(apiChatRoom: ChatRoom): Omit<PrismaChatRoom, 'id'> {
    return {
      name: apiChatRoom.name || null,
      type: apiChatRoom.type,
      createdBy: apiChatRoom.createdBy,
      createdAt: apiChatRoom.createdAt,
      lastMessageAt: apiChatRoom.lastMessageAt,
    };
  }
}