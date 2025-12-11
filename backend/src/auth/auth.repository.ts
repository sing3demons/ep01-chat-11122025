import { User, NotificationSettings, PrivacySettings, PrismaClient } from '@prisma/client';
import prisma from '../config/database';
import { DefaultArgs } from '@prisma/client/runtime/library';

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

export interface IAuthRepository {
  createUser(data: CreateUserData): Promise<User>;
  findUserById(id: string): Promise<User | null>;
  findUserByEmail(email: string): Promise<User | null>;
  findUserByUsername(username: string): Promise<User | null>;
  findUserByEmailOrUsername(email: string, username: string): Promise<User | null>;
  updateUser(id: string, data: UpdateUserData): Promise<User>;
  updateUserOnlineStatus(id: string, isOnline: boolean): Promise<User>;
  createNotificationSettings(userId: string): Promise<NotificationSettings>;
  createPrivacySettings(userId: string): Promise<PrivacySettings>;
  getNotificationSettings(userId: string): Promise<NotificationSettings | null>;
  getPrivacySettings(userId: string): Promise<PrivacySettings | null>;
}

/**
 * Auth Repository
 * Handles all database operations related to authentication
 */
export class AuthRepository implements IAuthRepository {
  constructor(private readonly prismaInstance: PrismaClient<{
    log: ("info" | "query" | "warn" | "error")[];
    errorFormat: "pretty";
  }, never, DefaultArgs> = prisma) {}
  /**
   * Create a new user
   */
  async createUser(data: CreateUserData): Promise<User> {
    return await this.prismaInstance.user.create({
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
  async findUserById(id: string): Promise<User | null> {
    return await this.prismaInstance.user.findUnique({
      where: { id }
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
      data
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
   * Create default notification settings for user
   */
  async createNotificationSettings(userId: string): Promise<NotificationSettings> {
    return await this.prismaInstance.notificationSettings.create({
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
  async createPrivacySettings(userId: string): Promise<PrivacySettings> {
    return await this.prismaInstance.privacySettings.create({
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
  async getNotificationSettings(userId: string): Promise<NotificationSettings | null> {
    return await this.prismaInstance.notificationSettings.findUnique({
      where: { userId }
    });
  }

  /**
   * Get privacy settings by user ID
   */
  async getPrivacySettings(userId: string): Promise<PrivacySettings | null> {
    return await this.prismaInstance.privacySettings.findUnique({
      where: { userId }
    });
  }
}