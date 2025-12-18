import { IRouter, Router } from 'express';
import { ChatRoomController } from './chatroom.controller';
import { ChatRoomService } from './chatroom.service';
import { ChatRoomRepository } from './chatroom.repository';
import { AuthMiddleware } from '../middleware/auth';
import { ICustomLogger } from '../logger/logger';
import { AuthRepository, AuthService } from '../auth';
import prisma from '../config/database';


// const router = Router();


function registerChatRoomRoutes(router: IRouter, logger: ICustomLogger): IRouter {

    /**
     * ChatRoom Routes
     */
    const chatRoomRepository = new ChatRoomRepository(prisma, logger);
    const chatRoomService = new ChatRoomService(chatRoomRepository);

    const authRepository = new AuthRepository(prisma, logger);
    const authService = new AuthService(authRepository);
    const authMiddleware = new AuthMiddleware(authService);

    const chatRoomController = new ChatRoomController(chatRoomService, logger);

    // All chat room routes require authentication
    router.use(authMiddleware.authenticate);

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
    return router;
}

export default registerChatRoomRoutes;