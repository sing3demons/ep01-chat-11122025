import { Router } from 'express';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { AuthMiddleware } from '../middleware/auth';

const router = Router();

/**
 * User Routes
 */

const userController = new UserController(new UserService(new UserRepository()));

// All user routes require authentication
router.use(AuthMiddleware.authenticate);

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

export default router;