import { Router } from 'express';
import { ChatRoomController } from './chatroom.controller';
import { ChatRoomService } from './chatroom.service';
import { ChatRoomRepository } from './chatroom.repository';
import { AuthMiddleware } from '../middleware/auth';

const router = Router();

/**
 * ChatRoom Routes
 */

const chatRoomController = new ChatRoomController(new ChatRoomService(new ChatRoomRepository()));

// All chat room routes require authentication
router.use(AuthMiddleware.authenticate);

// Chat room CRUD routes
router.post('/', chatRoomController.createChatRoom);
router.get('/', chatRoomController.getUserChatRooms);
router.get('/hidden', chatRoomController.getUserHiddenChatRooms);
router.get('/:id', chatRoomController.getChatRoomById);
router.put('/:id', chatRoomController.updateChatRoom);
router.delete('/:id', chatRoomController.deleteChatRoom);

// Participant management routes
router.post('/:id/participants', chatRoomController.addParticipant);
router.delete('/:id/participants/:userId', chatRoomController.removeParticipant);
router.put('/:id/participants/:userId', chatRoomController.updateParticipantRole);

// Chat room actions
router.post('/:id/leave', chatRoomController.leaveChatRoom);
router.post('/:id/hide', chatRoomController.hideChatRoom);
router.post('/:id/unhide', chatRoomController.unhideChatRoom);

export default router;