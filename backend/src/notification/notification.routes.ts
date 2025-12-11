import { Router } from 'express';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationRepository } from './notification.repository';
import { AuthMiddleware } from '../middleware/auth';

const router = Router();

/**
 * Notification Routes
 */

const notificationController = new NotificationController(new NotificationService(new NotificationRepository()));

// All notification routes require authentication
router.use(AuthMiddleware.authenticate);

// Notification CRUD routes
router.get('/', notificationController.getUserNotifications);
router.post('/', notificationController.createNotification);
router.delete('/:id', notificationController.deleteNotification);

// Notification actions
router.put('/:id/read', notificationController.markAsRead);
router.put('/read-all', notificationController.markAllAsRead);

// Notification settings
router.get('/settings', notificationController.getNotificationSettings);
router.put('/settings', notificationController.updateNotificationSettings);

// Notification statistics
router.get('/unread-count', notificationController.getUnreadCount);
router.get('/unread-count-by-type', notificationController.getUnreadCountByType);
router.get('/badge', notificationController.getNotificationBadgeData);

export default router;