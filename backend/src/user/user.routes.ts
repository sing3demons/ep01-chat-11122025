import { IRouter } from 'express';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { AuthMiddleware } from '../middleware/auth';
import { ICustomLogger } from '../logger/logger';
import prisma from '../config/database';
import { AuthRepository, AuthService } from '../auth';


function registerUserRoutes(router: IRouter, logger: ICustomLogger): IRouter {

    /**
     * User Routes
     */
    const userRepository = new UserRepository(prisma, logger);
    const userService = new UserService(userRepository);

    const authRepository = new AuthRepository(prisma, logger);
    const authService = new AuthService(authRepository);
    const authMiddleware = new AuthMiddleware(authService);

    const userController = new UserController(userService, logger);

    // All user routes require authentication
    router.use(authMiddleware.authenticate);

    // User profile routes
    router.get('/search', userController.searchUsers);
    router.get('/:id', userController.getUserById);
    router.put('/:id', userController.updateUser);

    // User status routes
    router.post('/:id/status', userController.updateOnlineStatus);

    // Privacy settings routes
    router.get('/:id/privacy', userController.getPrivacySettings);
    router.put('/:id/privacy', userController.updatePrivacySettings);

    // Contact management routes
    router.get('/:id/contacts', userController.getUserContacts);
    router.post('/:id/contacts', userController.addContact);
    router.delete('/:id/contacts/:contactId', userController.removeContact);

    // User blocking routes
    router.get('/:id/blocked', userController.getBlockedUsers);
    router.post('/:id/blocked', userController.blockUser);
    router.delete('/:id/blocked/:blockedUserId', userController.unblockUser);

    // Mutual contacts route
    router.get('/:id/mutual/:otherUserId', userController.getMutualContacts);
    return router;
}

export default registerUserRoutes;