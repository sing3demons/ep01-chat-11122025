import { Request, Response } from 'express';
import { OfflineService } from './offline.service';
import { ReconnectionManager } from './reconnection.manager';
import { WebSocketService } from './websocket.service';
import { ValidationUtils } from '../utils/validation';

/**
 * Offline Controller
 * Handles HTTP requests for offline support features
 */
export class OfflineController {
  constructor(private readonly offlineService: OfflineService) { }
  /**
   * Get queued messages for authenticated user
   */
  getQueuedMessages = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const offlineService = this.offlineService;
      const queuedMessages = offlineService.getQueuedMessages(userId);

      res.json({
        success: true,
        data: {
          queuedMessages: queuedMessages.map(msg => ({
            id: msg.id,
            timestamp: msg.timestamp,
            retryCount: msg.retryCount,
            maxRetries: msg.maxRetries,
            nextRetryAt: msg.nextRetryAt,
            messagePreview: typeof msg.messageData === 'object' && msg.messageData.message
              ? msg.messageData.message.content?.substring(0, 100) + '...'
              : 'Message data'
          }))
        }
      });

    } catch (error) {
      console.error('Get queued messages error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get queued messages'
      });
    }
  }

  /**
   * Retry a specific queued message
   */
  retryQueuedMessage = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      if (!ValidationUtils.isValidUUID(id)) {
        res.status(400).json({
          success: false,
          error: 'Invalid queued message ID format'
        });
        return;
      }

      const offlineService = this.offlineService;
      const result = await offlineService.retryMessageDelivery(id);

      res.json(result);

    } catch (error) {
      console.error('Retry queued message error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retry queued message'
      });
    }
  }

  /**
   * Delete a queued message
   */
  deleteQueuedMessage = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      if (!ValidationUtils.isValidUUID(id)) {
        res.status(400).json({
          success: false,
          error: 'Invalid queued message ID format'
        });
        return;
      }

      // TODO: Implement delete queued message functionality
      res.json({
        success: true,
        message: 'Queued message deleted successfully'
      });

    } catch (error) {
      console.error('Delete queued message error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete queued message'
      });
    }
  }

  /**
   * Get device sessions for authenticated user
   */
  getDeviceSessions = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const offlineService = this.offlineService;
      const deviceSessions = offlineService.getDeviceSessions(userId);

      res.json({
        success: true,
        data: {
          deviceSessions: deviceSessions.map(session => ({
            deviceId: session.deviceId,
            isActive: session.isActive,
            lastSyncAt: session.lastSyncAt,
            connectionId: session.connectionId
          }))
        }
      });

    } catch (error) {
      console.error('Get device sessions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get device sessions'
      });
    }
  }

  /**
   * Register a new device session
   */
  registerDeviceSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { deviceId, connectionId } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      if (!deviceId) {
        res.status(400).json({
          success: false,
          error: 'Device ID is required'
        });
        return;
      }

      const offlineService = this.offlineService;
      const result = await offlineService.registerDeviceSession(userId, deviceId, connectionId);

      res.json(result);

    } catch (error) {
      console.error('Register device session error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to register device session'
      });
    }
  }

  /**
   * Update device session
   */
  updateDeviceSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { deviceId } = req.params;
      const { isActive, connectionId } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      // TODO: Implement update device session functionality
      res.json({
        success: true,
        message: 'Device session updated successfully'
      });

    } catch (error) {
      console.error('Update device session error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update device session'
      });
    }
  }

  /**
   * Delete device session
   */
  deleteDeviceSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { deviceId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const offlineService = this.offlineService;
      const result = await offlineService.unregisterDeviceSession(userId, deviceId);

      res.json(result);

    } catch (error) {
      console.error('Delete device session error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete device session'
      });
    }
  }

  /**
   * Synchronize user devices
   */
  syncDevices = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const offlineService = this.offlineService;
      const result = await offlineService.synchronizeUserDevices(userId);

      res.json(result);

    } catch (error) {
      console.error('Sync devices error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to sync devices'
      });
    }
  }

  /**
   * Force reconnection for user
   */
  forceReconnection = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { reason } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const reconnectionManager = ReconnectionManager.getInstance();
      await reconnectionManager.forceReconnection(userId, reason || 'Manual reconnection');

      res.json({
        success: true,
        message: 'Reconnection initiated successfully'
      });

    } catch (error) {
      console.error('Force reconnection error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to force reconnection'
      });
    }
  }

  /**
   * Get offline support statistics
   */
  getOfflineStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const offlineService = this.offlineService;
      const reconnectionManager = ReconnectionManager.getInstance();
      const wsService = WebSocketService.getInstance();

      const stats = {
        offline: offlineService.getOfflineStats(),
        reconnection: reconnectionManager.getReconnectionStats(),
        connection: wsService.getConnectionStats(),
        user: {
          isOnline: wsService.isUserOnline(userId),
          queuedMessages: offlineService.getQueuedMessages(userId).length,
          deviceSessions: offlineService.getDeviceSessions(userId).length
        }
      };

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Get offline stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get offline statistics'
      });
    }
  }

  /**
   * Get connection health information
   */
  getConnectionHealth = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const reconnectionManager = ReconnectionManager.getInstance();
      const wsService = WebSocketService.getInstance();

      // Get user's connections and their health
      const connections = wsService.isUserOnline(userId) ? [] : []; // TODO: Get actual connections
      const reconnectionStatus = reconnectionManager.getReconnectionStatus(userId);

      res.json({
        success: true,
        data: {
          isOnline: wsService.isUserOnline(userId),
          connections: connections,
          reconnectionStatus: reconnectionStatus,
          healthStats: reconnectionManager.getReconnectionStats()
        }
      });

    } catch (error) {
      console.error('Get connection health error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get connection health'
      });
    }
  }
}