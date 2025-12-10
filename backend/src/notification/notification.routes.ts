import { Router } from 'express';
import { NotificationController } from './notification.controller';
import { AuthMiddleware } from '../middleware/auth';

const router = Router();

/**
 * Notification Routes
 */

// All notification routes require authentication
router.use(AuthMiddleware.authenticate);

// Notification CRUD routes
router.get('/', NotificationController.getUserNotifications);
router.post('/', NotificationController.createNotification);
router.delete('/:id', NotificationController.deleteNotification);

// Notification actions
router.put('/:id/read', NotificationController.markAsRead);
router.put('/read-all', NotificationController.markAllAsRead);

// Notification settings
router.get('/settings', NotificationController.getNotificationSettings);
router.put('/settings', NotificationController.updateNotificationSettings);

// Notification statistics
router.get('/unread-count', NotificationController.getUnreadCount);
router.get('/unread-count-by-type', NotificationController.getUnreadCountByType);
router.get('/badge', NotificationController.getNotificationBadgeData);

export default router;