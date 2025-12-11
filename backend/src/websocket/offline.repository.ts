import { PrismaClient } from '@prisma/client';
import database from '../config/database';

export interface QueuedMessageData {
  id?: string;
  userId: string;
  messageData: string;
  retryCount?: number;
  maxRetries?: number;
  nextRetryAt?: Date;
}

export interface DeviceSessionData {
  id?: string;
  userId: string;
  deviceId: string;
  connectionId?: string;
  isActive?: boolean;
  lastSyncAt?: Date;
}

/**
 * Offline Repository
 * Handles database operations for offline support features
 */
export class OfflineRepository {
  private static prisma: PrismaClient = database;

  /**
   * Create queued message
   */
  static async createQueuedMessage(data: QueuedMessageData): Promise<any> {
    return await this.prisma.queuedMessage.create({
      data: {
        userId: data.userId,
        messageData: data.messageData,
        retryCount: data.retryCount || 0,
        maxRetries: data.maxRetries || 5,
        nextRetryAt: data.nextRetryAt || new Date()
      }
    });
  }

  /**
   * Get queued messages for user
   */
  static async getQueuedMessagesByUser(userId: string): Promise<any[]> {
    return await this.prisma.queuedMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' }
    });
  }

  /**
   * Get queued message by ID
   */
  static async getQueuedMessageById(id: string): Promise<any | null> {
    return await this.prisma.queuedMessage.findUnique({
      where: { id }
    });
  }

  /**
   * Update queued message
   */
  static async updateQueuedMessage(id: string, data: Partial<QueuedMessageData>): Promise<any> {
    return await this.prisma.queuedMessage.update({
      where: { id },
      data: {
        ...(data.retryCount !== undefined && { retryCount: data.retryCount }),
        ...(data.maxRetries !== undefined && { maxRetries: data.maxRetries }),
        ...(data.nextRetryAt !== undefined && { nextRetryAt: data.nextRetryAt }),
        ...(data.messageData !== undefined && { messageData: data.messageData })
      }
    });
  }

  /**
   * Delete queued message
   */
  static async deleteQueuedMessage(id: string): Promise<void> {
    await this.prisma.queuedMessage.delete({
      where: { id }
    });
  }

  /**
   * Delete queued messages for user
   */
  static async deleteQueuedMessagesByUser(userId: string): Promise<void> {
    await this.prisma.queuedMessage.deleteMany({
      where: { userId }
    });
  }

  /**
   * Get queued messages ready for retry
   */
  static async getQueuedMessagesForRetry(): Promise<any[]> {
    return await this.prisma.queuedMessage.findMany({
      where: {
        nextRetryAt: {
          lte: new Date()
        }
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            isOnline: true
          }
        }
      },
      orderBy: { nextRetryAt: 'asc' }
    });
  }

  /**
   * Create or update device session
   */
  static async upsertDeviceSession(data: DeviceSessionData): Promise<any> {
    return await this.prisma.deviceSession.upsert({
      where: {
        userId_deviceId: {
          userId: data.userId,
          deviceId: data.deviceId
        }
      },
      update: {
        connectionId: data.connectionId,
        isActive: data.isActive !== undefined ? data.isActive : true,
        lastSyncAt: data.lastSyncAt || new Date()
      },
      create: {
        userId: data.userId,
        deviceId: data.deviceId,
        connectionId: data.connectionId,
        isActive: data.isActive !== undefined ? data.isActive : true,
        lastSyncAt: data.lastSyncAt || new Date()
      }
    });
  }

  /**
   * Get device sessions for user
   */
  static async getDeviceSessionsByUser(userId: string): Promise<any[]> {
    return await this.prisma.deviceSession.findMany({
      where: { userId },
      orderBy: { lastSyncAt: 'desc' }
    });
  }

  /**
   * Get active device sessions for user
   */
  static async getActiveDeviceSessionsByUser(userId: string): Promise<any[]> {
    return await this.prisma.deviceSession.findMany({
      where: { 
        userId,
        isActive: true
      },
      orderBy: { lastSyncAt: 'desc' }
    });
  }

  /**
   * Get device session by user and device
   */
  static async getDeviceSession(userId: string, deviceId: string): Promise<any | null> {
    return await this.prisma.deviceSession.findUnique({
      where: {
        userId_deviceId: {
          userId,
          deviceId
        }
      }
    });
  }

  /**
   * Update device session
   */
  static async updateDeviceSession(
    userId: string, 
    deviceId: string, 
    data: Partial<DeviceSessionData>
  ): Promise<any> {
    return await this.prisma.deviceSession.update({
      where: {
        userId_deviceId: {
          userId,
          deviceId
        }
      },
      data: {
        ...(data.connectionId !== undefined && { connectionId: data.connectionId }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.lastSyncAt !== undefined && { lastSyncAt: data.lastSyncAt })
      }
    });
  }

  /**
   * Deactivate device session
   */
  static async deactivateDeviceSession(userId: string, deviceId: string): Promise<any> {
    return await this.prisma.deviceSession.update({
      where: {
        userId_deviceId: {
          userId,
          deviceId
        }
      },
      data: {
        isActive: false,
        connectionId: null
      }
    });
  }

  /**
   * Delete device session
   */
  static async deleteDeviceSession(userId: string, deviceId: string): Promise<void> {
    await this.prisma.deviceSession.delete({
      where: {
        userId_deviceId: {
          userId,
          deviceId
        }
      }
    });
  }

  /**
   * Delete old inactive device sessions
   */
  static async deleteOldInactiveSessions(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.prisma.deviceSession.deleteMany({
      where: {
        isActive: false,
        lastSyncAt: {
          lt: cutoffDate
        }
      }
    });

    return result.count;
  }

  /**
   * Get offline support statistics
   */
  static async getOfflineStats(): Promise<{
    totalQueuedMessages: number;
    totalDeviceSessions: number;
    activeDeviceSessions: number;
    usersWithQueuedMessages: number;
    usersWithActiveSessions: number;
  }> {
    const [
      totalQueuedMessages,
      totalDeviceSessions,
      activeDeviceSessions,
      usersWithQueuedMessages,
      usersWithActiveSessions
    ] = await Promise.all([
      this.prisma.queuedMessage.count(),
      this.prisma.deviceSession.count(),
      this.prisma.deviceSession.count({ where: { isActive: true } }),
      this.prisma.queuedMessage.groupBy({
        by: ['userId'],
        _count: { userId: true }
      }).then(result => result.length),
      this.prisma.deviceSession.groupBy({
        by: ['userId'],
        where: { isActive: true },
        _count: { userId: true }
      }).then(result => result.length)
    ]);

    return {
      totalQueuedMessages,
      totalDeviceSessions,
      activeDeviceSessions,
      usersWithQueuedMessages,
      usersWithActiveSessions
    };
  }

  /**
   * Clean up old queued messages
   */
  static async cleanupOldQueuedMessages(olderThanHours: number = 24): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - olderThanHours);

    const result = await this.prisma.queuedMessage.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        },
        retryCount: {
          gte: 5 // Only delete messages that have exceeded max retries
        }
      }
    });

    return result.count;
  }
}