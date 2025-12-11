import { Router } from 'express';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';
import { MessageRepository } from './message.repository';
import { NotificationService } from '../notification/notification.service';
import { NotificationRepository } from '../notification/notification.repository';
import { AuthMiddleware } from '../middleware/auth';

const router = Router();

/**
 * Message Routes
 */

const messageRepository = new MessageRepository();
const notificationRepository = new NotificationRepository();
const notificationService = new NotificationService(notificationRepository);
const messageService = new MessageService(messageRepository, notificationService);
const messageController = new MessageController(messageService);

// All message routes require authentication
router.use(AuthMiddleware.authenticate);

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

export default router;