import { Router } from 'express';
import { AuthController } from './auth.controller';
import { AuthMiddleware } from '../middleware/auth';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';

const router = Router();

/**
 * Authentication Routes
 */

const authController = new AuthController(new AuthService(new AuthRepository()));

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes
router.post('/logout', AuthMiddleware.authenticate, authController.logout);
router.get('/me', AuthMiddleware.authenticate, authController.getCurrentUser);
router.post('/refresh', AuthMiddleware.validateTokenFormat, authController.refreshToken);
router.post('/change-password', AuthMiddleware.authenticate, authController.changePassword);

export default router;