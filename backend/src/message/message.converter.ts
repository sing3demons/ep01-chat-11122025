import { Message as PrismaMessage, User as PrismaUser } from '@prisma/client';
import { Message, MessageWithSender, MessageStatus } from './message.model';

/**
 * Message model converters
 */
export class MessageConverter {
  /**
   * Convert Prisma Message to API Message
   */
  static toApiMessage(prismaMessage: PrismaMessage): Message {
    return {
      id: prismaMessage.id,
      content: prismaMessage.content,
      senderId: prismaMessage.senderId,
      chatRoomId: prismaMessage.chatRoomId,
      status: prismaMessage.status as MessageStatus,
      timestamp: prismaMessage.createdAt, // Use createdAt as timestamp
      createdAt: prismaMessage.createdAt,
    };
  }

  /**
   * Convert Prisma Message with sender to API format
   */
  static toApiMessageWithSender(
    prismaMessage: PrismaMessage & { 
      sender: PrismaUser 
    }
  ): MessageWithSender {
    const message = this.toApiMessage(prismaMessage);
    
    return {
      ...message,
      sender: {
        id: prismaMessage.sender.id,
        username: prismaMessage.sender.username,
        isOnline: prismaMessage.sender.isOnline,
      },
    };
  }

  /**
   * Convert API Message to Prisma Message format
   */
  static toPrismaMessage(apiMessage: Message): Omit<PrismaMessage, 'id'> {
    return {
      content: apiMessage.content,
      senderId: apiMessage.senderId,
      chatRoomId: apiMessage.chatRoomId,
      status: apiMessage.status,
      createdAt: apiMessage.createdAt,
    };
  }

  /**
   * Convert messages array with pagination info
   */
  static toApiMessagesWithPagination(
    prismaMessages: (PrismaMessage & { sender: PrismaUser })[],
    total: number,
    page: number,
    limit: number
  ): {
    messages: MessageWithSender[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  } {
    const messages = prismaMessages.map(msg => this.toApiMessageWithSender(msg));
    const totalPages = Math.ceil(total / limit);
    
    return {
      messages,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }
}