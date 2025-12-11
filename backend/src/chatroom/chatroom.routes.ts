import { Router } from 'express';
import { ChatRoomController } from './chatroom.controller';
import { AuthMiddleware } from '../middleware/auth';

const router = Router();

/**
 * ChatRoom Routes
 */

// All chat room routes require authentication
router.use(AuthMiddleware.authenticate);

// Chat room CRUD routes
router.post('/', ChatRoomController.createChatRoom);
router.get('/', ChatRoomController.getUserChatRooms);
router.get('/hidden', ChatRoomController.getUserHiddenChatRooms);
router.get('/:id', ChatRoomController.getChatRoomById);
router.put('/:id', ChatRoomController.updateChatRoom);
router.delete('/:id', ChatRoomController.deleteChatRoom);

// Participant management routes
router.post('/:id/participants', ChatRoomController.addParticipant);
router.delete('/:id/participants/:userId', ChatRoomController.removeParticipant);
router.put('/:id/participants/:userId', ChatRoomController.updateParticipantRole);

// Chat room actions
router.post('/:id/leave', ChatRoomController.leaveChatRoom);
router.post('/:id/hide', ChatRoomController.hideChatRoom);
router.post('/:id/unhide', ChatRoomController.unhideChatRoom);

export default router;