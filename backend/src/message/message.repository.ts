import { Message, User, ChatRoom } from '@prisma/client';
import prisma from '../config/database';
import { CreateMessageData, UpdateMessageData, MessageSearchQuery } from './message.model';

export class MessageRepository {
  static async createMessage(data: CreateMessageData): Promise<Message> {
    return await prisma.message.create({
      data: {
        content: data.content,
        senderId: data.senderId,
        chatRoomId: data.chatRoomId,
        status: 'sent'
      }
    });
  }

  static async getMessageById(id: string): Promise<Message | null> {
    return await prisma.message.findUnique({
      where: { id }
    });
  }

  static async getMessageByIdWithSender(id: string): Promise<any> {
    return await prisma.message.findUnique({
      where: { id },
      include: { sender: true }
    });
  }

  static async getMessagesByChatRoom(
    chatRoomId: string,
    limit: number = 50,
    offset: number = 0,
    before?: Date
  ): Promise<any[]> {
    const whereClause: any = { chatRoomId };
    if (before) {
      whereClause.createdAt = { lt: before };
    }

    return await prisma.message.findMany({
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

  static async updateMessage(id: string, data: UpdateMessageData): Promise<Message> {
    return await prisma.message.update({
      where: { id },
      data
    });
  }

  static async deleteMessage(id: string): Promise<Message> {
    return await prisma.message.delete({
      where: { id }
    });
  }

  static async searchMessages(query: MessageSearchQuery, userId: string): Promise<any[]> {
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

    return await prisma.message.findMany({
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

  static async isUserParticipantInChatRoom(userId: string, chatRoomId: string): Promise<boolean> {
    const participant = await prisma.chatRoomParticipant.findUnique({
      where: {
        chatRoomId_userId: { chatRoomId, userId }
      }
    });
    return participant !== null;
  }

  static async isUserAdminInChatRoom(userId: string, chatRoomId: string): Promise<boolean> {
    const participant = await prisma.chatRoomParticipant.findUnique({
      where: { chatRoomId_userId: { chatRoomId, userId } }
    });
    return participant?.role === 'admin';
  }

  static async updateChatRoomLastMessage(chatRoomId: string, messageId: string): Promise<ChatRoom> {
    return await prisma.chatRoom.update({
      where: { id: chatRoomId },
      data: { lastMessageAt: new Date() }
    });
  }

  static async getChatRoomParticipants(chatRoomId: string): Promise<any[]> {
    return await prisma.chatRoomParticipant.findMany({
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

  static async getUndeliveredMessagesForUser(userId: string, chatRoomId?: string): Promise<Message[]> {
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

    return await prisma.message.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' }
    });
  }

  static async getUnreadMessageCount(userId: string, chatRoomId?: string): Promise<number> {
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

    return await prisma.message.count({
      where: whereClause
    });
  }

  static async getChatRoomsWithRecentMessages(userId: string): Promise<any[]> {
    return await prisma.chatRoom.findMany({
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
  static async getChatRoomById(id: string): Promise<ChatRoom | null> {
    return await prisma.chatRoom.findUnique({
      where: { id }
    });
  }

  /**
   * Get user by ID
   */
  static async getUserById(id: string): Promise<any> {
    return await prisma.user.findUnique({
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
}