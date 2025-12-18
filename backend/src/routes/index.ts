// import { Router } from 'express';
// import authRoutes from '../auth/auth.routes';
// import { userRoutes } from '../user';
// import { messageRoutes } from '../message';
// import { chatroomRoutes } from '../chatroom';
// import { notificationRoutes } from '../notification';

// const router = Router();

// // Mount all routes
// router.use('/auth', authRoutes);
// router.use('/users', userRoutes);
// router.use('/messages', messageRoutes);
// router.use('/chatrooms', chatroomRoutes);
// router.use('/notifications', notificationRoutes);

// // Health check endpoint
// router.get('/health', (req, res) => {
//   res.json({
//     success: true,
//     message: 'Server is running',
//     timestamp: new Date().toISOString(),
//     version: '1.0.0'
//   });
// });

// // API info endpoint
// router.get('/', (req, res) => {
//   res.json({
//     success: true,
//     message: 'WhatsApp Chat System API',
//     version: '1.0.0',
//     endpoints: {
//       auth: '/api/auth',
//       users: '/api/users',
//       messages: '/api/messages',
//       chatrooms: '/api/chatrooms',
//       notifications: '/api/notifications',
//       health: '/api/health'
//     }
//   });
// });

// export default router;