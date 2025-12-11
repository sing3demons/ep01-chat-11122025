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

export interface IOfflineRepository {
  createQueuedMessage(data: QueuedMessageData): Promise<any>;
  getQueuedMessagesByUser(userId: string): Promise<any[]>;
  getQueuedMessageById(id: string): Promise<any | null>;
  updateQueuedMessage(id: string, data: Partial<QueuedMessageData>): Promise<any>;
  deleteQueuedMessage(id: string): Promise<void>;
  deleteQueuedMessagesByUser(userId: string): Promise<void>;
  getQueuedMessagesForRetry(): Promise<any[]>;
  upsertDeviceSession(data: DeviceSessionData): Promise<any>;
  getDeviceSessionsByUser(userId: string): Promise<any[]>;
  getActiveDeviceSessionsByUser(userId: string): Promise<any[]>;
  getDeviceSession(userId: string, deviceId: string): Promise<any | null>;
  updateDeviceSession(userId: string, deviceId: string, data: Partial<DeviceSessionData>): Promise<any>;
  deactivateDeviceSession(userId: string, deviceId: string): Promise<any>;
  deleteDeviceSession(userId: string, deviceId: string): Promise<void>;
  deleteOldInactiveSessions(olderThanDays?: number): Promise<number>;
  getOfflineStats(): Promise<{
    totalQueuedMessages: number;
    totalDeviceSessions: number;
    activeDeviceSessions: number;
    usersWithQueuedMessages: number;
    usersWithActiveSessions: number;
  }>;
  cleanupOldQueuedMessages(olderThanHours?: number): Promise<number>;
}

/**
 * Offline Repository
 * Handles database operations for offline support features
 */
export class OfflineRepository implements IOfflineRepository {
  constructor(private readonly prismaInstance: PrismaClient = database) {}

  /**
   * Create queued message
   */
  async createQueuedMessage(data: QueuedMessageData): Promise<any> {
    return await this.prismaInstance.queuedMessage.create({
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
  async getQueuedMessagesByUser(userId: string): Promise<any[]> {
    return await this.prismaInstance.queuedMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' }
    });
  }

  /**
   * Get queued message by ID
   */
  async getQueuedMessageById(id: string): Promise<any | null> {
    return await this.prismaInstance.queuedMessage.findUnique({
      where: { id }
    });
  }

  /**
   * Update queued message
   */
  async updateQueuedMessage(id: string, data: Partial<QueuedMessageData>): Promise<any> {
    return await this.prismaInstance.queuedMessage.update({
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
  async deleteQueuedMessage(id: string): Promise<void> {
    await this.prismaInstance.queuedMessage.delete({
      where: { id }
    });
  }

  /**
   * Delete queued messages for user
   */
  async deleteQueuedMessagesByUser(userId: string): Promise<void> {
    await this.prismaInstance.queuedMessage.deleteMany({
      where: { userId }
    });
  }

  /**
   * Get queued messages ready for retry
   */
  async getQueuedMessagesForRetry(): Promise<any[]> {
    return await this.prismaInstance.queuedMessage.findMany({
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
  async upsertDeviceSession(data: DeviceSessionData): Promise<any> {
    return await this.prismaInstance.deviceSession.upsert({
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
  async getDeviceSessionsByUser(userId: string): Promise<any[]> {
    return await this.prismaInstance.deviceSession.findMany({
      where: { userId },
      orderBy: { lastSyncAt: 'desc' }
    });
  }

  /**
   * Get active device sessions for user
   */
  async getActiveDeviceSessionsByUser(userId: string): Promise<any[]> {
    return await this.prismaInstance.deviceSession.findMany({
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
  async getDeviceSession(userId: string, deviceId: string): Promise<any | null> {
    return await this.prismaInstance.deviceSession.findUnique({
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
  async updateDeviceSession(
    userId: string, 
    deviceId: string, 
    data: Partial<DeviceSessionData>
  ): Promise<any> {
    return await this.prismaInstance.deviceSession.update({
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
  async deactivateDeviceSession(userId: string, deviceId: string): Promise<any> {
    return await this.prismaInstance.deviceSession.update({
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
  async deleteDeviceSession(userId: string, deviceId: string): Promise<void> {
    await this.prismaInstance.deviceSession.delete({
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
  async deleteOldInactiveSessions(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.prismaInstance.deviceSession.deleteMany({
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
  async getOfflineStats(): Promise<{
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
      this.prismaInstance.queuedMessage.count(),
      this.prismaInstance.deviceSession.count(),
      this.prismaInstance.deviceSession.count({ where: { isActive: true } }),
      this.prismaInstance.queuedMessage.groupBy({
        by: ['userId'],
        _count: { userId: true }
      }).then(result => result.length),
      this.prismaInstance.deviceSession.groupBy({
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
  async cleanupOldQueuedMessages(olderThanHours: number = 24): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - olderThanHours);

    const result = await this.prismaInstance.queuedMessage.deleteMany({
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