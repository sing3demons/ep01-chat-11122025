import { User, PrivacySettings } from '@prisma/client';
import prisma from '../config/database';
import { UpdateUserData } from './user.model';

/**
 * User Repository
 * Handles all database operations related to users
 */
export class UserRepository {
  /**
   * Find user by ID
   */
  static async findUserById(id: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { id }
    });
  }

  /**
   * Find user by ID with privacy settings
   */
  static async findUserByIdWithPrivacy(id: string): Promise<(User & { privacySettings?: PrivacySettings | null }) | null> {
    return await prisma.user.findUnique({
      where: { id },
      include: {
        privacySettings: true
      }
    });
  }

  /**
   * Find user by email
   */
  static async findUserByEmail(email: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { email }
    });
  }

  /**
   * Find user by username
   */
  static async findUserByUsername(username: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { username }
    });
  }

  /**
   * Find user by email or username
   */
  static async findUserByEmailOrUsername(email: string, username: string): Promise<User | null> {
    return await prisma.user.findFirst({
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
  static async updateUser(id: string, data: UpdateUserData): Promise<User> {
    return await prisma.user.update({
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
  static async updateUserOnlineStatus(id: string, isOnline: boolean): Promise<User> {
    return await prisma.user.update({
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
  static async searchUsersByUsername(
    query: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<(User & { privacySettings?: PrivacySettings | null })[]> {
    return await prisma.user.findMany({
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
  static async findUsersByIds(ids: string[]): Promise<User[]> {
    return await prisma.user.findMany({
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
  static async findUsersByIdsWithPrivacy(ids: string[]): Promise<(User & { privacySettings?: PrivacySettings | null })[]> {
    return await prisma.user.findMany({
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
  static async getPrivacySettings(userId: string): Promise<PrivacySettings | null> {
    return await prisma.privacySettings.findUnique({
      where: { userId }
    });
  }

  /**
   * Update user privacy settings
   */
  static async updatePrivacySettings(
    userId: string,
    data: Partial<PrivacySettings>
  ): Promise<PrivacySettings> {
    return await prisma.privacySettings.upsert({
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
  static async getOnlineUsersCount(): Promise<number> {
    return await prisma.user.count({
      where: {
        isOnline: true
      }
    });
  }

  /**
   * Get recently active users
   */
  static async getRecentlyActiveUsers(
    limit: number = 10,
    hoursAgo: number = 24
  ): Promise<User[]> {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hoursAgo);

    return await prisma.user.findMany({
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
  static async deleteUser(id: string): Promise<User> {
    // In a real application, you might want to soft delete
    // For now, we'll just update the user to be offline
    return await prisma.user.update({
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
  static async addContact(userId: string, contactId: string): Promise<void> {
    await prisma.contact.create({
      data: {
        userId,
        contactId
      }
    });
  }

  /**
   * Remove contact relationship
   */
  static async removeContact(userId: string, contactId: string): Promise<void> {
    await prisma.contact.delete({
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
  static async areUsersContacts(userId1: string, userId2: string): Promise<boolean> {
    const contact = await prisma.contact.findFirst({
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
  static async getUserContacts(userId: string): Promise<(User & { privacySettings?: PrivacySettings | null })[]> {
    const contacts = await prisma.contact.findMany({
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
  static async getMutualContacts(userId1: string, userId2: string): Promise<User[]> {
    const mutualContacts = await prisma.user.findMany({
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
  static async blockUser(userId: string, blockedUserId: string): Promise<void> {
    await prisma.blockedUser.create({
      data: {
        userId,
        blockedUserId
      }
    });
  }

  /**
   * Unblock a user
   */
  static async unblockUser(userId: string, blockedUserId: string): Promise<void> {
    await prisma.blockedUser.delete({
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
  static async isUserBlocked(userId: string, blockedUserId: string): Promise<boolean> {
    const blocked = await prisma.blockedUser.findUnique({
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
  static async getBlockedUsers(userId: string): Promise<User[]> {
    const blockedUsers = await prisma.blockedUser.findMany({
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
  static async isBlockedBy(userId: string, blockerUserId: string): Promise<boolean> {
    const blocked = await prisma.blockedUser.findUnique({
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