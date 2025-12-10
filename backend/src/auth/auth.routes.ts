import { Router } from 'express';
import { AuthController } from './auth.controller';
import { AuthMiddleware } from '../middleware/auth';

const router = Router();

/**
 * Authentication Routes
 */

// Public routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// Protected routes
router.post('/logout', AuthMiddleware.authenticate, AuthController.logout);
router.get('/me', AuthMiddleware.authenticate, AuthController.getCurrentUser);
router.post('/refresh', AuthMiddleware.validateTokenFormat, AuthController.refreshToken);
router.post('/change-password', AuthMiddleware.authenticate, AuthController.changePassword);

export default router;