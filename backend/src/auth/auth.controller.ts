import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { HTTP_STATUS } from '../config/constants';

/**
 * Authentication Controller
 * Handles HTTP requests and responses for authentication
 */
export class AuthController {
  /**
   * Register a new user
   * POST /auth/register
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Username, email, and password are required'
        });
        return;
      }

      const result = await AuthService.register({ username, email, password });

      if (result.success) {
        res.status(HTTP_STATUS.CREATED).json(result);
      } else {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
      }
    } catch (error) {
      console.error('Registration controller error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Login user
   * POST /auth/login
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Email and password are required'
        });
        return;
      }

      const result = await AuthService.login({ email, password });

      if (result.success) {
        res.status(HTTP_STATUS.OK).json(result);
      } else {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(result);
      }
    } catch (error) {
      console.error('Login controller error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Logout user
   * POST /auth/logout
   */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const result = await AuthService.logout(req.user.id);

      if (result.success) {
        res.status(HTTP_STATUS.OK).json(result);
      } else {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
      }
    } catch (error) {
      console.error('Logout controller error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get current user info
   * GET /auth/me
   */
  static async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const result = await AuthService.getSessionInfo(req.user.id);

      if (result.success) {
        res.status(HTTP_STATUS.OK).json(result);
      } else {
        res.status(HTTP_STATUS.NOT_FOUND).json(result);
      }
    } catch (error) {
      console.error('Get current user controller error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Refresh JWT token
   * POST /auth/refresh
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Token is required'
        });
        return;
      }

      const result = await AuthService.refreshToken(token);

      if (result.success) {
        res.status(HTTP_STATUS.OK).json(result);
      } else {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(result);
      }
    } catch (error) {
      console.error('Token refresh controller error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Change password for authenticated user
   * POST /auth/change-password
   */
  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Current password and new password are required'
        });
        return;
      }

      const result = await AuthService.changePassword(req.user.id, currentPassword, newPassword);

      if (result.success) {
        res.status(HTTP_STATUS.OK).json(result);
      } else {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
      }
    } catch (error) {
      console.error('Change password controller error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}