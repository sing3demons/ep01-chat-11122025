import { Router } from 'express';
import { OfflineController } from './offline.controller';
import { OfflineService } from './offline.service';
import { OfflineRepository } from './offline.repository';
import { MessageService } from '../message/message.service';
import { MessageRepository } from '../message/message.repository';
import { UserService } from '../user/user.service';
import { UserRepository } from '../user/user.repository';
import { AuthMiddleware } from '../middleware/auth';

const router = Router();

// Create dependencies
const offlineRepository = new OfflineRepository();
const messageRepository = new MessageRepository();
const userRepository = new UserRepository();
const messageService = new MessageService(messageRepository);
const userService = new UserService(userRepository);
const offlineService = OfflineService.getInstance(offlineRepository, messageService, userService);
const offlineController = new OfflineController(offlineService);

// Apply authentication middleware to all routes
router.use(AuthMiddleware.authenticate);

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

export { router as offlineRoutes };