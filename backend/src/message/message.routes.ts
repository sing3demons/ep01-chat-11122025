import { Router } from 'express';
import { MessageController } from './message.controller';
import { AuthMiddleware } from '../middleware/auth';

const router = Router();

/**
 * Message Routes
 */

// All message routes require authentication
router.use(AuthMiddleware.authenticate);

// Message CRUD routes
router.post('/', MessageController.sendMessage);
router.get('/search', MessageController.searchMessages);
router.get('/chatroom/:chatRoomId', MessageController.getMessagesByChatRoom);
router.get('/:id', MessageController.getMessageById);
router.put('/:id', MessageController.updateMessage);
router.delete('/:id', MessageController.deleteMessage);

// Message status routes
router.post('/:id/read', MessageController.markAsRead);
router.put('/:id/status', MessageController.updateMessageStatus);

// Real-time messaging routes
router.post('/typing', MessageController.handleTypingIndicator);
router.post('/mark-delivered', MessageController.markMessagesAsDelivered);

// Message utility routes
router.get('/unread-count', MessageController.getUnreadCount);
router.get('/chat-list', MessageController.getChatList);

export default router;