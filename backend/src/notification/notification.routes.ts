import { IRouter } from 'express';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationRepository } from './notification.repository';
import { AuthMiddleware } from '../middleware/auth';
import { ICustomLogger } from '../logger/logger';
import prisma from '../config/database';
import { AuthRepository, AuthService } from '../auth';



function registerNotificationRoutes(router: IRouter, logger: ICustomLogger): IRouter {

    /**
     * Notification Routes
     */
    const notificationRepository = new NotificationRepository(prisma, logger);
    const notificationService = new NotificationService(notificationRepository);

    const notificationController = new NotificationController(notificationService, logger);

    // All notification routes require authentication
    const authRepository = new AuthRepository(prisma, logger);
    const authService = new AuthService(authRepository);
    const authMiddleware = new AuthMiddleware(authService);
    router.use(authMiddleware.authenticate);

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
    return router;
}

export default registerNotificationRoutes;