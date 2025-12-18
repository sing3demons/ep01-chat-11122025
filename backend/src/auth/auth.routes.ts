import { type IRouter } from 'express';
import { AuthController } from './auth.controller';
import { AuthMiddleware } from '../middleware/auth';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import prisma from '../config/database';
import { ICustomLogger } from '@/logger/logger';

// const router: IRouter = Router();


function registerAuthRoutes(router: IRouter, logger: ICustomLogger): IRouter {
    /**
     * Authentication Routes
     */
    const authRepository = new AuthRepository(prisma, logger);
    const authService = new AuthService(authRepository);
    const authController = new AuthController(authService, logger);
    const authMiddleware = new AuthMiddleware(authService);

    // Public routes
    router.post('/register', authController.register);
    router.post('/login', authController.login);

    // Protected routes
    router.post('/logout', authMiddleware.authenticate, authController.logout);
    router.get('/me', authMiddleware.authenticate, authController.getCurrentUser);
    router.post('/refresh', AuthMiddleware.validateTokenFormat, authController.refreshToken);
    router.post('/change-password', authMiddleware.authenticate, authController.changePassword);
    return router;
}

// export default router;
export default registerAuthRoutes;