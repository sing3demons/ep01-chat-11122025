import { Router } from 'express';
import authRoutes from './auth/auth.routes';
import userRoutes from './user/user.routes';
import messageRoutes from './message/message.routes';
import chatroomRoutes from './chatroom/chatroom.routes';
import notificationRoutes from './notification/notification.routes';
import groupRoutes from './group/group.routes';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString()
  });
});

// API Routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/messages', messageRoutes);
router.use('/chatrooms', chatroomRoutes);
router.use('/notifications', notificationRoutes);
router.use('/groups', groupRoutes);

export default router;