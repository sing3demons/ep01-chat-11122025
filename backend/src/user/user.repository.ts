import { User, PrivacySettings } from '@prisma/client';
import prisma from '../config/database';
import { UpdateUserData } from './user.model';
import { ICustomLogger } from '../logger/logger';

export interface IUserRepository {
  findUserById(id: string): Promise<User | null>;
  findUserByIdWithPrivacy(id: string): Promise<(User & { privacySettings?: PrivacySettings | null }) | null>;
  findUserByEmail(email: string): Promise<User | null>;
  findUserByUsername(username: string): Promise<User | null>;
  findUserByEmailOrUsername(email: string, username: string): Promise<User | null>;
  updateUser(id: string, data: UpdateUserData): Promise<User>;
  updateUserOnlineStatus(id: string, isOnline: boolean): Promise<User>;
  searchUsersByUsername(query: string, limit?: number, offset?: number): Promise<(User & { privacySettings?: PrivacySettings | null })[]>;
  findUsersByIds(ids: string[]): Promise<User[]>;
  findUsersByIdsWithPrivacy(ids: string[]): Promise<(User & { privacySettings?: PrivacySettings | null })[]>;
  getPrivacySettings(userId: string): Promise<PrivacySettings | null>;
  updatePrivacySettings(userId: string, data: Partial<PrivacySettings>): Promise<PrivacySettings>;
  getOnlineUsersCount(): Promise<number>;
  getRecentlyActiveUsers(limit?: number, hoursAgo?: number): Promise<User[]>;
  deleteUser(id: string): Promise<User>;
  addContact(userId: string, contactId: string): Promise<void>;
  removeContact(userId: string, contactId: string): Promise<void>;
  areUsersContacts(userId1: string, userId2: string): Promise<boolean>;
  getUserContacts(userId: string): Promise<(User & { privacySettings?: PrivacySettings | null })[]>;
  getMutualContacts(userId1: string, userId2: string): Promise<User[]>;
  blockUser(userId: string, blockedUserId: string): Promise<void>;
  unblockUser(userId: string, blockedUserId: string): Promise<void>;
  isUserBlocked(userId: string, blockedUserId: string): Promise<boolean>;
  getBlockedUsers(userId: string): Promise<User[]>;
  isBlockedBy(userId: string, blockerUserId: string): Promise<boolean>;
}

/**
 * User Repository
 * Handles all database operations related to users
 */
export class UserRepository implements IUserRepository {
  constructor(private readonly prismaInstance = prisma, private readonly logger: ICustomLogger) {}
  /**
   * Find user by ID
   */
  async findUserById(id: string): Promise<User | null> {
    return await this.prismaInstance.user.findUnique({
      where: { id }
    });
  }

  /**
   * Find user by ID with privacy settings
   */
  async findUserByIdWithPrivacy(id: string): Promise<(User & { privacySettings?: PrivacySettings | null }) | null> {
    return await this.prismaInstance.user.findUnique({
      where: { id },
      include: {
        privacySettings: true
      }
    });
  }

  /**
   * Find user by email
   */
  async findUserByEmail(email: string): Promise<User | null> {
    return await this.prismaInstance.user.findUnique({
      where: { email }
    });
  }

  /**
   * Find user by username
   */
  async findUserByUsername(username: string): Promise<User | null> {
    return await this.prismaInstance.user.findUnique({
      where: { username }
    });
  }

  /**
   * Find user by email or username
   */
  async findUserByEmailOrUsername(email: string, username: string): Promise<User | null> {
    return await this.prismaInstance.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });
  }

  /**
   * Update user by ID
   */
  async updateUser(id: string, data: UpdateUserData): Promise<User> {
    return await this.prismaInstance.user.update({
      where: { id },
      data: {
        ...data,
        lastSeen: data.isOnline !== undefined ? new Date() : undefined
      }
    });
  }

  /**
   * Update user online status
   */
  async updateUserOnlineStatus(id: string, isOnline: boolean): Promise<User> {
    return await this.prismaInstance.user.update({
      where: { id },
      data: {
        isOnline,
        lastSeen: new Date()
      }
    });
  }

  /**
   * Search users by username
   */
  async searchUsersByUsername(
    query: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<(User & { privacySettings?: PrivacySettings | null })[]> {
    return await this.prismaInstance.user.findMany({
      where: {
        username: {
          contains: query,
          mode: 'insensitive'
        }
      },
      include: {
        privacySettings: true
      },
      take: limit,
      skip: offset,
      orderBy: {
        username: 'asc'
      }
    });
  }

  /**
   * Get multiple users by IDs
   */
  async findUsersByIds(ids: string[]): Promise<User[]> {
    return await this.prismaInstance.user.findMany({
      where: {
        id: {
          in: ids
        }
      }
    });
  }

  /**
   * Get multiple users by IDs with privacy settings
   */
  async findUsersByIdsWithPrivacy(ids: string[]): Promise<(User & { privacySettings?: PrivacySettings | null })[]> {
    return await this.prismaInstance.user.findMany({
      where: {
        id: {
          in: ids
        }
      },
      include: {
        privacySettings: true
      }
    });
  }

  /**
   * Get user privacy settings
   */
  async getPrivacySettings(userId: string): Promise<PrivacySettings | null> {
    return await this.prismaInstance.privacySettings.findUnique({
      where: { userId }
    });
  }

  /**
   * Update user privacy settings
   */
  async updatePrivacySettings(
    userId: string,
    data: Partial<PrivacySettings>
  ): Promise<PrivacySettings> {
    return await this.prismaInstance.privacySettings.upsert({
      where: { userId },
      update: {
        ...data,
        updatedAt: new Date()
      },
      create: {
        userId,
        showOnlineStatus: data.showOnlineStatus ?? true,
        showLastSeen: data.showLastSeen ?? true,
        allowContactsOnly: data.allowContactsOnly ?? false,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Get online users count
   */
  async getOnlineUsersCount(): Promise<number> {
    return await this.prismaInstance.user.count({
      where: {
        isOnline: true
      }
    });
  }

  /**
   * Get recently active users
   */
  async getRecentlyActiveUsers(
    limit: number = 10,
    hoursAgo: number = 24
  ): Promise<User[]> {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hoursAgo);

    return await this.prismaInstance.user.findMany({
      where: {
        lastSeen: {
          gte: cutoffDate
        }
      },
      orderBy: {
        lastSeen: 'desc'
      },
      take: limit
    });
  }

  /**
   * Delete user (soft delete by setting inactive)
   */
  async deleteUser(id: string): Promise<User> {
    // In a real application, you might want to soft delete
    // For now, we'll just update the user to be offline
    return await this.prismaInstance.user.update({
      where: { id },
      data: {
        isOnline: false,
        lastSeen: new Date()
      }
    });
  }

  /**
   * Add contact relationship
   */
  async addContact(userId: string, contactId: string): Promise<void> {
    await this.prismaInstance.contact.create({
      data: {
        userId,
        contactId
      }
    });
  }

  /**
   * Remove contact relationship
   */
  async removeContact(userId: string, contactId: string): Promise<void> {
    await this.prismaInstance.contact.delete({
      where: {
        userId_contactId: {
          userId,
          contactId
        }
      }
    });
  }

  /**
   * Check if users are contacts
   */
  async areUsersContacts(userId1: string, userId2: string): Promise<boolean> {
    const contact = await this.prismaInstance.contact.findFirst({
      where: {
        OR: [
          { userId: userId1, contactId: userId2 },
          { userId: userId2, contactId: userId1 }
        ]
      }
    });
    return !!contact;
  }

  /**
   * Get user's contacts with their details
   */
  async getUserContacts(userId: string): Promise<(User & { privacySettings?: PrivacySettings | null })[]> {
    const contacts = await this.prismaInstance.contact.findMany({
      where: { userId },
      include: {
        contact: {
          include: {
            privacySettings: true
          }
        }
      }
    });

    return contacts.map(c => c.contact);
  }

  /**
   * Get mutual contacts between two users
   */
  async getMutualContacts(userId1: string, userId2: string): Promise<User[]> {
    const mutualContacts = await this.prismaInstance.user.findMany({
      where: {
        AND: [
          {
            contactOf: {
              some: { userId: userId1 }
            }
          },
          {
            contactOf: {
              some: { userId: userId2 }
            }
          }
        ]
      }
    });

    return mutualContacts;
  }

  /**
   * Block a user
   */
  async blockUser(userId: string, blockedUserId: string): Promise<void> {
    await this.prismaInstance.blockedUser.create({
      data: {
        userId,
        blockedUserId
      }
    });
  }

  /**
   * Unblock a user
   */
  async unblockUser(userId: string, blockedUserId: string): Promise<void> {
    await this.prismaInstance.blockedUser.delete({
      where: {
        userId_blockedUserId: {
          userId,
          blockedUserId
        }
      }
    });
  }

  /**
   * Check if user is blocked
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

  /**
   * Get user's blocked users list
   */
  async getBlockedUsers(userId: string): Promise<User[]> {
    const blockedUsers = await this.prismaInstance.blockedUser.findMany({
      where: { userId },
      include: {
        blockedUser: true
      }
    });

    return blockedUsers.map(b => b.blockedUser);
  }

  /**
   * Check if user is blocked by another user
   */
  async isBlockedBy(userId: string, blockerUserId: string): Promise<boolean> {
    const blocked = await this.prismaInstance.blockedUser.findUnique({
      where: {
        userId_blockedUserId: {
          userId: blockerUserId,
          blockedUserId: userId
        }
      }
    });
    return !!blocked;
  }
}