import { Router, type Request, type Response, type IRouter } from 'express';
import authRoutes from './auth/auth.routes';
import userRoutes from './user/user.routes';
import messageRoutes from './message/message.routes';
import chatroomRoutes from './chatroom/chatroom.routes';
import notificationRoutes from './notification/notification.routes';
import groupRoutes from './group/group.routes';
import { offlineRoutes } from './websocket/offline.routes';
import { ICustomLogger } from './logger/logger';

function registerRoutes(logger: ICustomLogger): IRouter {
  const router: IRouter = Router();

  // Health check endpoint
  router.get('/health', (req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'Server is healthy',
      timestamp: new Date().toISOString()
    });
  });

  // API Routes
  router.use('/auth', authRoutes(router, logger));
  router.use('/users', userRoutes(router, logger));
  router.use('/messages', messageRoutes(router, logger));
  router.use('/chatrooms', chatroomRoutes(router, logger));
  router.use('/notifications', notificationRoutes(router, logger));
  router.use('/groups', groupRoutes(router, logger));
  router.use('/offline', offlineRoutes(router, logger));
  return router;
}

export default registerRoutes;