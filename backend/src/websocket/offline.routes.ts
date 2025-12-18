import { IRouter } from 'express';
import { OfflineController } from './offline.controller';
import { OfflineService } from './offline.service';
import { OfflineRepository } from './offline.repository';
import { MessageService } from '../message/message.service';
import { MessageRepository } from '../message/message.repository';
import { UserService } from '../user/user.service';
import { UserRepository } from '../user/user.repository';
import { AuthMiddleware } from '../middleware/auth';
import { ICustomLogger } from '../logger/logger';
import prisma from '../config/database';
import { AuthRepository, AuthService } from '../auth';



function offlineRoutes(router: IRouter, logger: ICustomLogger): IRouter {

    // Create dependencies
    const offlineRepository = new OfflineRepository(prisma, logger);
    const messageRepository = new MessageRepository(prisma, logger);
    const userRepository = new UserRepository(prisma, logger);
    const messageService = new MessageService(messageRepository);
    const userService = new UserService(userRepository);
    const offlineService = OfflineService.getInstance(offlineRepository, messageService, userService);
    const offlineController = new OfflineController(offlineService, logger);

    // Apply authentication middleware to all routes
    const authRepository = new AuthRepository(prisma, logger);
    const authService = new AuthService(authRepository);
    const authMiddleware = new AuthMiddleware(authService);
    router.use(authMiddleware.authenticate);

    // Queued messages routes
    router.get('/queued-messages', offlineController.getQueuedMessages);
    router.post('/queued-messages/:id/retry', offlineController.retryQueuedMessage);
    router.delete('/queued-messages/:id', offlineController.deleteQueuedMessage);

    // Device sessions routes
    router.get('/device-sessions', offlineController.getDeviceSessions);
    router.post('/device-sessions', offlineController.registerDeviceSession);
    router.put('/device-sessions/:deviceId', offlineController.updateDeviceSession);
    router.delete('/device-sessions/:deviceId', offlineController.deleteDeviceSession);

    // Synchronization routes
    router.post('/sync-devices', offlineController.syncDevices);
    router.post('/force-reconnection', offlineController.forceReconnection);

    // Statistics routes
    router.get('/stats', offlineController.getOfflineStats);

    // Connection health routes
    router.get('/connection-health', offlineController.getConnectionHealth);
    return router;
}

export { offlineRoutes };