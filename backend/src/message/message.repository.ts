import { Message, User, ChatRoom } from '@prisma/client';
import prisma from '../config/database';
import { CreateMessageData, UpdateMessageData, MessageSearchQuery } from './message.model';
import { ICustomLogger } from '../logger/logger';

export interface IMessageRepository {
  createMessage(data: CreateMessageData): Promise<Message>;
  getMessageById(id: string): Promise<Message | null>;
  getMessageByIdWithSender(id: string): Promise<any>;
  getMessagesByChatRoom(
    chatRoomId: string,
    limit?: number,
    offset?: number,
    before?: Date
  ): Promise<any[]>;
  updateMessage(id: string, data: UpdateMessageData): Promise<Message>;
  deleteMessage(id: string): Promise<Message>;
  searchMessages(query: MessageSearchQuery, userId: string): Promise<any[]>;
  isUserParticipantInChatRoom(userId: string, chatRoomId: string): Promise<boolean>;
  isUserAdminInChatRoom(userId: string, chatRoomId: string): Promise<boolean>;
  updateChatRoomLastMessage(chatRoomId: string, messageId: string): Promise<ChatRoom>;
  getChatRoomParticipants(chatRoomId: string): Promise<any[]>;
  getUndeliveredMessagesForUser(userId: string, chatRoomId?: string): Promise<Message[]>;
  getUnreadMessageCount(userId: string, chatRoomId?: string): Promise<number>;
  getChatRoomsWithRecentMessages(userId: string): Promise<any[]>;
  getChatRoomById(id: string): Promise<ChatRoom | null>;
  getUserById(id: string): Promise<any>;
  isUserBlocked(userId: string, blockedUserId: string): Promise<boolean>;
}

export class MessageRepository implements IMessageRepository {
  constructor(private readonly prismaInstance = prisma, private readonly logger: ICustomLogger) { }
  async createMessage(data: CreateMessageData): Promise<Message> {
    return await this.prismaInstance.message.create({
      data: {
        content: data.content,
        senderId: data.senderId,
        chatRoomId: data.chatRoomId,
        status: 'sent'
      }
    });
  }

  async getMessageById(id: string): Promise<Message | null> {
    return await this.prismaInstance.message.findUnique({
      where: { id }
    });
  }

  async getMessageByIdWithSender(id: string): Promise<any> {
    return await this.prismaInstance.message.findUnique({
      where: { id },
      include: { sender: true }
    });
  }

  async getMessagesByChatRoom(
    chatRoomId: string,
    limit: number = 50,
    offset: number = 0,
    before?: Date
  ): Promise<any[]> {
    const whereClause: any = { chatRoomId };
    if (before) {
      whereClause.createdAt = { lt: before };
    }

    return await this.prismaInstance.message.findMany({
      where: whereClause,
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            isOnline: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });
  }

  async updateMessage(id: string, data: UpdateMessageData): Promise<Message> {
    return await this.prismaInstance.message.update({
      where: { id },
      data
    });
  }

  async deleteMessage(id: string): Promise<Message> {
    return await this.prismaInstance.message.delete({
      where: { id }
    });
  }

  async searchMessages(query: MessageSearchQuery, userId: string): Promise<any[]> {
    const whereClause: any = {
      content: { contains: query.query, mode: 'insensitive' }
    };

    if (query.chatRoomId) {
      whereClause.chatRoomId = query.chatRoomId;
    } else {
      whereClause.chatRoom = {
        participants: { some: { userId } }
      };
    }

    if (query.senderId) {
      whereClause.senderId = query.senderId;
    }

    if (query.fromDate || query.toDate) {
      whereClause.createdAt = {};
      if (query.fromDate) whereClause.createdAt.gte = query.fromDate;
      if (query.toDate) whereClause.createdAt.lte = query.toDate;
    }

    return await this.prismaInstance.message.findMany({
      where: whereClause,
      include: {
        sender: {
          select: { id: true, username: true, isOnline: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit || 20,
      skip: query.offset || 0
    });
  }

  async isUserParticipantInChatRoom(userId: string, chatRoomId: string): Promise<boolean> {
    const participant = await this.prismaInstance.chatRoomParticipant.findUnique({
      where: {
        chatRoomId_userId: { chatRoomId, userId }
      }
    });
    return participant !== null;
  }

  async isUserAdminInChatRoom(userId: string, chatRoomId: string): Promise<boolean> {
    const participant = await this.prismaInstance.chatRoomParticipant.findUnique({
      where: { chatRoomId_userId: { chatRoomId, userId } }
    });
    return participant?.role === 'admin';
  }

  async updateChatRoomLastMessage(chatRoomId: string, messageId: string): Promise<ChatRoom> {
    return await this.prismaInstance.chatRoom.update({
      where: { id: chatRoomId },
      data: { lastMessageAt: new Date() }
    });
  }

  async getChatRoomParticipants(chatRoomId: string): Promise<any[]> {
    return await this.prismaInstance.chatRoomParticipant.findMany({
      where: { chatRoomId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            isOnline: true
          }
        }
      }
    });
  }

  async getUndeliveredMessagesForUser(userId: string, chatRoomId?: string): Promise<Message[]> {
    const whereClause: any = {
      status: 'sent',
      senderId: { not: userId },
      chatRoom: {
        participants: { some: { userId } }
      }
    };

    if (chatRoomId) {
      whereClause.chatRoomId = chatRoomId;
    }

    return await this.prismaInstance.message.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' }
    });
  }

  async getUnreadMessageCount(userId: string, chatRoomId?: string): Promise<number> {
    const whereClause: any = {
      senderId: { not: userId },
      status: { in: ['sent', 'delivered'] },
      chatRoom: {
        participants: { some: { userId } }
      }
    };

    if (chatRoomId) {
      whereClause.chatRoomId = chatRoomId;
    }

    return await this.prismaInstance.message.count({
      where: whereClause
    });
  }

  async getChatRoomsWithRecentMessages(userId: string): Promise<any[]> {
    return await this.prismaInstance.chatRoom.findMany({
      where: {
        participants: { some: { userId } }
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                username: true
              }
            }
          }
        },
        _count: {
          select: {
            messages: {
              where: {
                senderId: { not: userId },
                status: { in: ['sent', 'delivered'] }
              }
            }
          }
        }
      },
      orderBy: { lastMessageAt: 'desc' }
    }).then(chatRooms =>
      chatRooms.map(chatRoom => ({
        ...chatRoom,
        lastMessage: chatRoom.messages[0] || null,
        unreadCount: chatRoom._count.messages
      }))
    );
  }

  /**
   * Get chat room by ID
   */
  async getChatRoomById(id: string): Promise<ChatRoom | null> {
    return await this.prismaInstance.chatRoom.findUnique({
      where: { id }
    });
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<any> {
    return await this.prismaInstance.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true
      }
    });
  }

  /**
   * Check if user is blocked by another user
   */
  async isUserBlocked(userId: string, blockedUserId: string): Promise<boolean> {
    const blocked = await this.prismaInstance.blockedUser.findUnique({
      where: {
        userId_blockedUserId: {
          userId,
          blockedUserId
        }
      }
    });
    return !!blocked;
  }
}