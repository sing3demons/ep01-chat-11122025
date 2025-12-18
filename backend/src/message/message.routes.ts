import { IRouter, Router } from 'express';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';
import { MessageRepository } from './message.repository';
import { NotificationService } from '../notification/notification.service';
import { NotificationRepository } from '../notification/notification.repository';
import { AuthMiddleware } from '../middleware/auth';
import { ICustomLogger } from '../logger/logger';
import { AuthRepository, AuthService } from '../auth';
import prisma from '../config/database';



function registerMessageRoutes(router: IRouter, logger: ICustomLogger): IRouter {

    /**
     * Message Routes
     */

    const messageRepository = new MessageRepository(prisma, logger);
    const notificationRepository = new NotificationRepository(prisma, logger);
    const notificationService = new NotificationService(notificationRepository);
    const messageService = new MessageService(messageRepository, notificationService);
    const messageController = new MessageController(messageService, logger);
    // All message routes require authentication
    const authRepository = new AuthRepository(prisma, logger);
    const authService = new AuthService(authRepository);
    const authMiddleware = new AuthMiddleware(authService);
    router.use(authMiddleware.authenticate);

    // Message CRUD routes
    router.post('/', messageController.sendMessage);
    router.get('/search', messageController.searchMessages);
    router.get('/chatroom/:chatRoomId', messageController.getMessagesByChatRoom);
    router.get('/:id', messageController.getMessageById);
    router.put('/:id', messageController.updateMessage);
    router.delete('/:id', messageController.deleteMessage);

    // Message status routes
    router.post('/:id/read', messageController.markAsRead);
    router.put('/:id/status', messageController.updateMessageStatus);

    // Real-time messaging routes
    router.post('/typing', messageController.handleTypingIndicator);
    router.post('/mark-delivered', messageController.markMessagesAsDelivered);

    // Message utility routes
    router.get('/unread-count', messageController.getUnreadCount);
    router.get('/chat-list', messageController.getChatList);
    return router;
}

export default registerMessageRoutes;