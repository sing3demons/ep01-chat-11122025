import { User, NotificationSettings, PrivacySettings } from '@prisma/client';
import prisma from '../config/database';

export interface CreateUserData {
  username: string;
  email: string;
  passwordHash: string;
}

export interface UpdateUserData {
  isOnline?: boolean;
  lastSeen?: Date;
  passwordHash?: string;
}

/**
 * Auth Repository
 * Handles all database operations related to authentication
 */
export class AuthRepository {
  /**
   * Create a new user
   */
  static async createUser(data: CreateUserData): Promise<User> {
    return await prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        passwordHash: data.passwordHash,
        isOnline: true,
        lastSeen: new Date()
      }
    });
  }

  /**
   * Find user by ID
   */
  static async findUserById(id: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { id }
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
      data
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
   * Create default notification settings for user
   */
  static async createNotificationSettings(userId: string): Promise<NotificationSettings> {
    return await prisma.notificationSettings.create({
      data: {
        userId,
        soundEnabled: true,
        desktopNotifications: true,
        mentionNotifications: true,
        groupNotifications: true
      }
    });
  }

  /**
   * Create default privacy settings for user
   */
  static async createPrivacySettings(userId: string): Promise<PrivacySettings> {
    return await prisma.privacySettings.create({
      data: {
        userId,
        showOnlineStatus: true,
        showLastSeen: true,
        allowContactsOnly: false
      }
    });
  }

  /**
   * Get notification settings by user ID
   */
  static async getNotificationSettings(userId: string): Promise<NotificationSettings | null> {
    return await prisma.notificationSettings.findUnique({
      where: { userId }
    });
  }

  /**
   * Get privacy settings by user ID
   */
  static async getPrivacySettings(userId: string): Promise<PrivacySettings | null> {
    return await prisma.privacySettings.findUnique({
      where: { userId }
    });
  }
}