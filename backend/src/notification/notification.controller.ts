import { Request, Response } from 'express';
import { NotificationService } from './notification.service';
import { HTTP_STATUS } from '../config/constants';

/**
 * Notification Controller
 * Handles HTTP requests and responses for notification operations
 */
export class NotificationController {
  /**
   * Get user notifications
   * GET /notifications
   */
  static async getUserNotifications(req: Request, res: Response): Promise<void> {
    try {
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const query = {
        userId: currentUserId,
        isRead: req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined,
        type: req.query.type as any,
        priority: req.query.priority as any,
        fromDate: req.query.fromDate ? new Date(req.query.fromDate as string) : undefined,
        toDate: req.query.toDate ? new Date(req.query.toDate as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
      };

      const result = await NotificationService.getUserNotifications(query);

      if (result.success) {
        res.status(HTTP_STATUS.OK).json(result);
      } else {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
      }
    } catch (error) {
      console.error('Get user notifications controller error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Create notification
   * POST /notifications
   */
  static async createNotification(req: Request, res: Response): Promise<void> {
    try {
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const result = await NotificationService.createNotification(req.body);

      if (result.success) {
        res.status(HTTP_STATUS.CREATED).json(result);
      } else {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
      }
    } catch (error) {
      console.error('Create notification controller error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Mark notification as read
   * PUT /notifications/:id/read
   */
  static async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      if (!id) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Notification ID is required'
        });
        return;
      }

      const result = await NotificationService.markAsRead(id, currentUserId);

      if (result.success) {
        res.status(HTTP_STATUS.OK).json(result);
      } else {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
      }
    } catch (error) {
      console.error('Mark notification as read controller error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Mark all notifications as read
   * PUT /notifications/read-all
   */
  static async markAllAsRead(req: Request, res: Response): Promise<void> {
    try {
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const result = await NotificationService.markAllAsRead(currentUserId);

      if (result.success) {
        res.status(HTTP_STATUS.OK).json(result);
      } else {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
      }
    } catch (error) {
      console.error('Mark all notifications as read controller error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Delete notification
   * DELETE /notifications/:id
   */
  static async deleteNotification(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      if (!id) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Notification ID is required'
        });
        return;
      }

      const result = await NotificationService.deleteNotification(id, currentUserId);

      if (result.success) {
        res.status(HTTP_STATUS.OK).json(result);
      } else {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
      }
    } catch (error) {
      console.error('Delete notification controller error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get notification settings
   * GET /notifications/settings
   */
  static async getNotificationSettings(req: Request, res: Response): Promise<void> {
    try {
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const result = await NotificationService.getNotificationSettings(currentUserId);

      if (result.success) {
        res.status(HTTP_STATUS.OK).json(result);
      } else {
        res.status(HTTP_STATUS.NOT_FOUND).json(result);
      }
    } catch (error) {
      console.error('Get notification settings controller error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Update notification settings
   * PUT /notifications/settings
   */
  static async updateNotificationSettings(req: Request, res: Response): Promise<void> {
    try {
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const result = await NotificationService.updateNotificationSettings(currentUserId, req.body);

      if (result.success) {
        res.status(HTTP_STATUS.OK).json(result);
      } else {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
      }
    } catch (error) {
      console.error('Update notification settings controller error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get unread notification count
   * GET /notifications/unread-count
   */
  static async getUnreadCount(req: Request, res: Response): Promise<void> {
    try {
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const result = await NotificationService.getUnreadCount(currentUserId);

      if (result.success) {
        res.status(HTTP_STATUS.OK).json(result);
      } else {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
      }
    } catch (error) {
      console.error('Get unread count controller error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get unread notification count by type
   * GET /notifications/unread-count-by-type
   */
  static async getUnreadCountByType(req: Request, res: Response): Promise<void> {
    try {
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const result = await NotificationService.getUnreadCountByType(currentUserId);

      if (result.success) {
        res.status(HTTP_STATUS.OK).json(result);
      } else {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
      }
    } catch (error) {
      console.error('Get unread count by type controller error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get notification badge data
   * GET /notifications/badge
   */
  static async getNotificationBadgeData(req: Request, res: Response): Promise<void> {
    try {
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const result = await NotificationService.getNotificationBadgeData(currentUserId);

      if (result.success) {
        res.status(HTTP_STATUS.OK).json(result);
      } else {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
      }
    } catch (error) {
      console.error('Get notification badge data controller error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}