import { Router } from 'express';
import { UserController } from './user.controller';
import { AuthMiddleware } from '../middleware/auth';

const router = Router();

/**
 * User Routes
 */

// All user routes require authentication
router.use(AuthMiddleware.authenticate);

// User profile routes
router.get('/search', UserController.searchUsers);
router.get('/:id', UserController.getUserById);
router.put('/:id', UserController.updateUser);

// User status routes
router.post('/:id/status', UserController.updateOnlineStatus);

// Privacy settings routes
router.get('/:id/privacy', UserController.getPrivacySettings);
router.put('/:id/privacy', UserController.updatePrivacySettings);

// Contact management routes
router.get('/:id/contacts', UserController.getUserContacts);
router.post('/:id/contacts', UserController.addContact);
router.delete('/:id/contacts/:contactId', UserController.removeContact);

// User blocking routes
router.get('/:id/blocked', UserController.getBlockedUsers);
router.post('/:id/blocked', UserController.blockUser);
router.delete('/:id/blocked/:blockedUserId', UserController.unblockUser);

// Mutual contacts route
router.get('/:id/mutual/:otherUserId', UserController.getMutualContacts);

export default router;