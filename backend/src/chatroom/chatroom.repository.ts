import { ChatRoom, ChatRoomParticipant, User, Message, PrismaClient } from '@prisma/client';
import prisma from '../config/database';
import { CreateChatRoomData, UpdateChatRoomData, AddParticipantData } from './chatroom.model';
import { CHAT_ROOM_TYPES, USER_ROLES } from '../config/constants';
import { DBActionEnum, ICustomLogger, LogAction } from '../logger/logger';
import { MaskingRule } from '@/logger/masking';
import { PrismaModelClient } from '@/utils/sqlBuilder';

export interface IChatRoomRepository {
  createChatRoom(data: CreateChatRoomData): Promise<ChatRoom>;
  getChatRoomById(id: string): Promise<ChatRoom | null>;
  getChatRoomByIdWithParticipants(id: string): Promise<any>;
  getChatRoomByIdWithDetails(id: string): Promise<any>;
  updateChatRoom(id: string, data: UpdateChatRoomData): Promise<ChatRoom>;
  deleteChatRoom(id: string): Promise<ChatRoom>;
  getUserChatRooms(userId: string, limit?: number, offset?: number): Promise<any[]>;
  findDirectChatBetweenUsers(userId1: string, userId2: string): Promise<ChatRoom | null>;
  addParticipant(chatRoomId: string, data: AddParticipantData): Promise<ChatRoomParticipant>;
  removeParticipant(chatRoomId: string, userId: string): Promise<ChatRoomParticipant>;
  updateParticipantRole(chatRoomId: string, userId: string, role: string): Promise<ChatRoomParticipant>;
  getChatRoomParticipants(chatRoomId: string): Promise<any[]>;
  getParticipant(chatRoomId: string, userId: string): Promise<ChatRoomParticipant | null>;
  isUserParticipant(chatRoomId: string, userId: string): Promise<boolean>;
  isUserAdmin(chatRoomId: string, userId: string): Promise<boolean>;
  verifyUsersExist(userIds: string[]): Promise<boolean>;
  getChatRoomStatistics(chatRoomId: string): Promise<{
    participantCount: number;
    messageCount: number;
    adminCount: number;
    createdAt: Date;
    lastActivity: Date;
  }>;
  searchChatRoomsByName(query: string, userId: string, limit?: number, offset?: number): Promise<ChatRoom[]>;
  getActiveChatRooms(userId: string, hoursAgo?: number, limit?: number): Promise<ChatRoom[]>;
  hideChatRoomForUser(chatRoomId: string, userId: string): Promise<void>;
  unhideChatRoomForUser(chatRoomId: string, userId: string): Promise<void>;
  isChatRoomHiddenForUser(chatRoomId: string, userId: string): Promise<boolean>;
  getUserHiddenChatRooms(userId: string, limit?: number, offset?: number): Promise<any[]>;
}

/**
 * ChatRoom Repository
 * Handles all database operations related to chat rooms
 */
export class ChatRoomRepository implements IChatRoomRepository {
  constructor(private readonly prismaInstance = prisma, private readonly logger: ICustomLogger) { }
  /**
   * Create a new chat room with participants
   */
  async createChatRoom(data: CreateChatRoomData): Promise<ChatRoom> {
    return await this.prismaInstance.$transaction(async (tx) => {
      // Create chat room
      const chatRoomBody = {
        name: data.name,
        type: data.type,
        createdBy: data.createdBy,
        lastMessageAt: new Date()
      }
      const qb = new PrismaModelClient<Partial<ChatRoom>>('chatRoom')
      // const chatRoom = await tx.chatRoom.create({
      //   data: {
      //     name: data.name,
      //     type: data.type,
      //     createdBy: data.createdBy,
      //     lastMessageAt: new Date()
      //   }
      // });
      const chatRoom = await this.trackDependency(
        {
          dependency: 'chatRoom',
          operation: DBActionEnum.CREATE,
          query: qb.create({ data: chatRoomBody }).sql,
          params: chatRoomBody,
        },
        () => tx.chatRoom.create({ data: chatRoomBody })
      )

      // Add participants
      const participantData = data.participantIds.map((userId, index) => ({
        chatRoomId: chatRoom.id,
        userId,
        role: userId === data.createdBy ? USER_ROLES.ADMIN : USER_ROLES.MEMBER,
        joinedAt: new Date()
      }));

      // await tx.chatRoomParticipant.createMany({
      //   data: participantData
      // });
      await this.trackDependency(
        {
          dependency: 'chatRoomParticipant',
          operation: DBActionEnum.CREATE,
          query: new PrismaModelClient('chatRoomParticipant').createMany(participantData).sql,
          params: participantData,
        },
        () => tx.chatRoomParticipant.createMany({ data: participantData })
      )

      return chatRoom;
    });
  }

  /**
   * Get chat room by ID
   */
  async getChatRoomById(id: string): Promise<ChatRoom | null> {
    const qb = new PrismaModelClient<ChatRoom>('chatRoom')
    // return await this.prismaInstance.chatRoom.findUnique({
    //   where: { id }
    // });
    return await this.trackDependency(
      {
        dependency: 'chatRoom',
        operation: DBActionEnum.READ,
        query: qb.findFirst({ where: { id: id } }).sql,
        params: { id },
      },
      () => this.prismaInstance.chatRoom.findUnique({
        where: { id }
      })
    )
  }

  /**
   * Get chat room by ID with participants
   */
  async getChatRoomByIdWithParticipants(id: string): Promise<any> {
    return await this.prismaInstance.chatRoom.findUnique({
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
  async getChatRoomByIdWithDetails(id: string): Promise<any> {
    const chatRoom = await this.prismaInstance.chatRoom.findUnique({
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
  async updateChatRoom(id: string, data: UpdateChatRoomData): Promise<ChatRoom> {
    return await this.prismaInstance.chatRoom.update({
      where: { id },
      data
    });
  }

  /**
   * Delete chat room
   */
  async deleteChatRoom(id: string): Promise<ChatRoom> {
    return await this.prismaInstance.chatRoom.delete({
      where: { id }
    });
  }

  /**
   * Get user's chat rooms (excluding hidden ones)
   */
  async getUserChatRooms(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<any[]> {
    return await this.prismaInstance.chatRoom.findMany({
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
            hiddenBy: {
              none: {
                userId
              }
            }
          }
        ]
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
  async findDirectChatBetweenUsers(userId1: string, userId2: string): Promise<ChatRoom | null> {
    return await this.prismaInstance.chatRoom.findFirst({
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
  async addParticipant(chatRoomId: string, data: AddParticipantData): Promise<ChatRoomParticipant> {
    return await this.prismaInstance.chatRoomParticipant.create({
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
  async removeParticipant(chatRoomId: string, userId: string): Promise<ChatRoomParticipant> {
    return await this.prismaInstance.chatRoomParticipant.delete({
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
  async updateParticipantRole(
    chatRoomId: string,
    userId: string,
    role: string
  ): Promise<ChatRoomParticipant> {
    return await this.prismaInstance.chatRoomParticipant.update({
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
  async getChatRoomParticipants(chatRoomId: string): Promise<any[]> {
    return await this.prismaInstance.chatRoomParticipant.findMany({
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
  async getParticipant(chatRoomId: string, userId: string): Promise<ChatRoomParticipant | null> {
    return await this.prismaInstance.chatRoomParticipant.findUnique({
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
  async isUserParticipant(chatRoomId: string, userId: string): Promise<boolean> {
    const participant = await this.getParticipant(chatRoomId, userId);
    return participant !== null;
  }

  /**
   * Check if user is admin in chat room
   */
  async isUserAdmin(chatRoomId: string, userId: string): Promise<boolean> {
    const participant = await this.getParticipant(chatRoomId, userId);
    return participant?.role === USER_ROLES.ADMIN;
  }

  /**
   * Verify that all users exist
   */
  async verifyUsersExist(userIds: string[]): Promise<boolean> {
    const userCount = await this.prismaInstance.user.count({
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
  async getChatRoomStatistics(chatRoomId: string): Promise<{
    participantCount: number;
    messageCount: number;
    adminCount: number;
    createdAt: Date;
    lastActivity: Date;
  }> {
    const [participantCount, messageCount, adminCount, chatRoom] = await Promise.all([
      this.prismaInstance.chatRoomParticipant.count({
        where: { chatRoomId }
      }),
      this.prismaInstance.message.count({
        where: { chatRoomId }
      }),
      this.prismaInstance.chatRoomParticipant.count({
        where: {
          chatRoomId,
          role: USER_ROLES.ADMIN
        }
      }),
      this.prismaInstance.chatRoom.findUnique({
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
  async searchChatRoomsByName(
    query: string,
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<ChatRoom[]> {
    return await this.prismaInstance.chatRoom.findMany({
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
  async getActiveChatRooms(
    userId: string,
    hoursAgo: number = 24,
    limit: number = 10
  ): Promise<ChatRoom[]> {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hoursAgo);

    return await this.prismaInstance.chatRoom.findMany({
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

  /**
   * Hide chat room for user
   */
  async hideChatRoomForUser(chatRoomId: string, userId: string): Promise<void> {
    await this.prismaInstance.hiddenChatRoom.upsert({
      where: {
        userId_chatRoomId: {
          userId,
          chatRoomId
        }
      },
      update: {
        hiddenAt: new Date()
      },
      create: {
        userId,
        chatRoomId,
        hiddenAt: new Date()
      }
    });
  }

  /**
   * Unhide chat room for user
   */
  async unhideChatRoomForUser(chatRoomId: string, userId: string): Promise<void> {
    await this.prismaInstance.hiddenChatRoom.delete({
      where: {
        userId_chatRoomId: {
          userId,
          chatRoomId
        }
      }
    }).catch(() => {
      // Ignore error if record doesn't exist
    });
  }

  /**
   * Check if chat room is hidden for user
   */
  async isChatRoomHiddenForUser(chatRoomId: string, userId: string): Promise<boolean> {
    const hidden = await this.prismaInstance.hiddenChatRoom.findUnique({
      where: {
        userId_chatRoomId: {
          userId,
          chatRoomId
        }
      }
    });
    return !!hidden;
  }

  /**
   * Get user's hidden chat rooms
   */
  async getUserHiddenChatRooms(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<any[]> {
    return await this.prismaInstance.chatRoom.findMany({
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
            hiddenBy: {
              some: {
                userId
              }
            }
          }
        ]
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
        },
        hiddenBy: {
          where: {
            userId
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
  private async trackDependency<T extends (...args: any) => any>(
    option: { dependency: string, operation: string, query?: string, params?: any, maskingParams?: Array<MaskingRule>, maskingBody?: Array<MaskingRule> },
    dbQueryFunc: T,
  ) {
    let sql = option.query || ''
    let params = option.params || ''
    let start = performance.now()
    this.logger.setDependencyMetadata({
      dependency: option.dependency,
    }).debug(LogAction.DB_REQUEST(option.operation, sql), { params }, option.maskingParams);
    const result = await dbQueryFunc();
    this.logger.setDependencyMetadata({
      dependency: option.dependency,
      responseTime: performance.now() - start
    }).debug(LogAction.DB_RESPONSE(option.operation, sql), result, option.maskingBody);
    return result as ReturnType<typeof dbQueryFunc>
  }
}