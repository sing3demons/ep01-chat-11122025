import { Router } from 'express';
import { OfflineController } from './offline.controller';
import { AuthMiddleware } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(AuthMiddleware.authenticate);

// Queued messages routes
router.get('/queued-messages', OfflineController.getQueuedMessages);
router.post('/queued-messages/:id/retry', OfflineController.retryQueuedMessage);
router.delete('/queued-messages/:id', OfflineController.deleteQueuedMessage);

// Device sessions routes
router.get('/device-sessions', OfflineController.getDeviceSessions);
router.post('/device-sessions', OfflineController.registerDeviceSession);
router.put('/device-sessions/:deviceId', OfflineController.updateDeviceSession);
router.delete('/device-sessions/:deviceId', OfflineController.deleteDeviceSession);

// Synchronization routes
router.post('/sync-devices', OfflineController.syncDevices);
router.post('/force-reconnection', OfflineController.forceReconnection);

// Statistics routes
router.get('/stats', OfflineController.getOfflineStats);

// Connection health routes
router.get('/connection-health', OfflineController.getConnectionHealth);

export { router as offlineRoutes };