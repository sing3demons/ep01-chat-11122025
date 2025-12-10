import { ChatRoom, ChatRoomParticipant, User, Message } from '@prisma/client';
import prisma from '../config/database';
import { CreateChatRoomData, UpdateChatRoomData, AddParticipantData } from './chatroom.model';
import { CHAT_ROOM_TYPES, USER_ROLES } from '../config/constants';

/**
 * ChatRoom Repository
 * Handles all database operations related to chat rooms
 */
export class ChatRoomRepository {
  /**
   * Create a new chat room with participants
   */
  static async createChatRoom(data: CreateChatRoomData): Promise<ChatRoom> {
    return await prisma.$transaction(async (tx) => {
      // Create chat room
      const chatRoom = await tx.chatRoom.create({
        data: {
          name: data.name,
          type: data.type,
          createdBy: data.createdBy,
          lastMessageAt: new Date()
        }
      });

      // Add participants
      const participantData = data.participantIds.map((userId, index) => ({
        chatRoomId: chatRoom.id,
        userId,
        role: userId === data.createdBy ? USER_ROLES.ADMIN : USER_ROLES.MEMBER,
        joinedAt: new Date()
      }));

      await tx.chatRoomParticipant.createMany({
        data: participantData
      });

      return chatRoom;
    });
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
   * Get chat room by ID with participants
   */
  static async getChatRoomByIdWithParticipants(id: string): Promise<any> {
    return await prisma.chatRoom.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                isOnline: true,
                lastSeen: true,
                createdAt: true,
                passwordHash: true
              }
            }
          }
        }
      }
    });
  }

  /**
   * Get chat room by ID with full details
   */
  static async getChatRoomByIdWithDetails(id: string): Promise<any> {
    const chatRoom = await prisma.chatRoom.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                isOnline: true,
                lastSeen: true,
                createdAt: true,
                passwordHash: true
              }
            }
          }
        },
        _count: {
          select: {
            participants: true
          }
        },
        messages: {
          take: 1,
          orderBy: {
            createdAt: 'desc'
          },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                email: true,
                isOnline: true,
                lastSeen: true,
                createdAt: true,
                passwordHash: true
              }
            }
          }
        }
      }
    });

    return chatRoom;
  }

  /**
   * Update chat room
   */
  static async updateChatRoom(id: string, data: UpdateChatRoomData): Promise<ChatRoom> {
    return await prisma.chatRoom.update({
      where: { id },
      data
    });
  }

  /**
   * Delete chat room
   */
  static async deleteChatRoom(id: string): Promise<ChatRoom> {
    return await prisma.chatRoom.delete({
      where: { id }
    });
  }

  /**
   * Get user's chat rooms
   */
  static async getUserChatRooms(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<any[]> {
    return await prisma.chatRoom.findMany({
      where: {
        participants: {
          some: {
            userId
          }
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                isOnline: true,
                lastSeen: true,
                createdAt: true,
                passwordHash: true
              }
            }
          }
        },
        _count: {
          select: {
            participants: true
          }
        },
        messages: {
          take: 1,
          orderBy: {
            createdAt: 'desc'
          },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                email: true,
                isOnline: true,
                lastSeen: true,
                createdAt: true,
                passwordHash: true
              }
            }
          }
        }
      },
      orderBy: {
        lastMessageAt: 'desc'
      },
      take: limit,
      skip: offset
    });
  }

  /**
   * Find direct chat between two users
   */
  static async findDirectChatBetweenUsers(userId1: string, userId2: string): Promise<ChatRoom | null> {
    return await prisma.chatRoom.findFirst({
      where: {
        type: CHAT_ROOM_TYPES.DIRECT,
        participants: {
          every: {
            userId: {
              in: [userId1, userId2]
            }
          }
        },
        AND: [
          {
            participants: {
              some: {
                userId: userId1
              }
            }
          },
          {
            participants: {
              some: {
                userId: userId2
              }
            }
          }
        ]
      }
    });
  }

  /**
   * Add participant to chat room
   */
  static async addParticipant(chatRoomId: string, data: AddParticipantData): Promise<ChatRoomParticipant> {
    return await prisma.chatRoomParticipant.create({
      data: {
        chatRoomId,
        userId: data.userId,
        role: data.role || USER_ROLES.MEMBER,
        joinedAt: new Date()
      }
    });
  }

  /**
   * Remove participant from chat room
   */
  static async removeParticipant(chatRoomId: string, userId: string): Promise<ChatRoomParticipant> {
    return await prisma.chatRoomParticipant.delete({
      where: {
        chatRoomId_userId: {
          chatRoomId,
          userId
        }
      }
    });
  }

  /**
   * Update participant role
   */
  static async updateParticipantRole(
    chatRoomId: string,
    userId: string,
    role: string
  ): Promise<ChatRoomParticipant> {
    return await prisma.chatRoomParticipant.update({
      where: {
        chatRoomId_userId: {
          chatRoomId,
          userId
        }
      },
      data: { role }
    });
  }

  /**
   * Get chat room participants
   */
  static async getChatRoomParticipants(chatRoomId: string): Promise<any[]> {
    return await prisma.chatRoomParticipant.findMany({
      where: { chatRoomId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            isOnline: true,
            lastSeen: true,
            createdAt: true,
            passwordHash: true
          }
        }
      }
    });
  }

  /**
   * Get specific participant
   */
  static async getParticipant(chatRoomId: string, userId: string): Promise<ChatRoomParticipant | null> {
    return await prisma.chatRoomParticipant.findUnique({
      where: {
        chatRoomId_userId: {
          chatRoomId,
          userId
        }
      }
    });
  }

  /**
   * Check if user is participant in chat room
   */
  static async isUserParticipant(chatRoomId: string, userId: string): Promise<boolean> {
    const participant = await this.getParticipant(chatRoomId, userId);
    return participant !== null;
  }

  /**
   * Check if user is admin in chat room
   */
  static async isUserAdmin(chatRoomId: string, userId: string): Promise<boolean> {
    const participant = await this.getParticipant(chatRoomId, userId);
    return participant?.role === USER_ROLES.ADMIN;
  }

  /**
   * Verify that all users exist
   */
  static async verifyUsersExist(userIds: string[]): Promise<boolean> {
    const userCount = await prisma.user.count({
      where: {
        id: {
          in: userIds
        }
      }
    });

    return userCount === userIds.length;
  }

  /**
   * Get chat room statistics
   */
  static async getChatRoomStatistics(chatRoomId: string): Promise<{
    participantCount: number;
    messageCount: number;
    adminCount: number;
    createdAt: Date;
    lastActivity: Date;
  }> {
    const [participantCount, messageCount, adminCount, chatRoom] = await Promise.all([
      prisma.chatRoomParticipant.count({
        where: { chatRoomId }
      }),
      prisma.message.count({
        where: { chatRoomId }
      }),
      prisma.chatRoomParticipant.count({
        where: {
          chatRoomId,
          role: USER_ROLES.ADMIN
        }
      }),
      prisma.chatRoom.findUnique({
        where: { id: chatRoomId },
        select: {
          createdAt: true,
          lastMessageAt: true
        }
      })
    ]);

    return {
      participantCount,
      messageCount,
      adminCount,
      createdAt: chatRoom?.createdAt || new Date(),
      lastActivity: chatRoom?.lastMessageAt || new Date()
    };
  }

  /**
   * Search chat rooms by name
   */
  static async searchChatRoomsByName(
    query: string,
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<ChatRoom[]> {
    return await prisma.chatRoom.findMany({
      where: {
        AND: [
          {
            participants: {
              some: {
                userId
              }
            }
          },
          {
            OR: [
              {
                name: {
                  contains: query,
                  mode: 'insensitive'
                }
              },
              {
                type: CHAT_ROOM_TYPES.DIRECT,
                participants: {
                  some: {
                    user: {
                      username: {
                        contains: query,
                        mode: 'insensitive'
                      }
                    }
                  }
                }
              }
            ]
          }
        ]
      },
      take: limit,
      skip: offset,
      orderBy: {
        lastMessageAt: 'desc'
      }
    });
  }

  /**
   * Get active chat rooms (with recent messages)
   */
  static async getActiveChatRooms(
    userId: string,
    hoursAgo: number = 24,
    limit: number = 10
  ): Promise<ChatRoom[]> {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hoursAgo);

    return await prisma.chatRoom.findMany({
      where: {
        participants: {
          some: {
            userId
          }
        },
        lastMessageAt: {
          gte: cutoffDate
        }
      },
      orderBy: {
        lastMessageAt: 'desc'
      },
      take: limit
    });
  }
}