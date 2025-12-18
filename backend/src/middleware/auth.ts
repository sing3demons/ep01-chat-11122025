import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../auth/auth.service';
import { JWTUtils } from '../utils/jwt';
import { HTTP_STATUS } from '../config/constants';

/**
 * Authentication Middleware
 * Handles JWT token validation and user authentication
 */
export class AuthMiddleware {
  constructor(private readonly authService: AuthService) { }
  /**
   * Middleware to authenticate JWT token
   */
  authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Extract token from Authorization header
      const token = JWTUtils.extractTokenFromHeader(req.headers.authorization);

      if (!token) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'Access token is required',
        });
        return;
      }

      // Verify token and get user
      const result = await this.authService.verifyToken(token);

      if (!result.success) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: result.error,
        });
        return;
      }

      // Attach user to request object
      req.user = result.data;

      next();
    } catch (error) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      });
    }
  }

  /**
   * Optional authentication middleware (doesn't fail if no token)
   */
  optionalAuthenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = JWTUtils.extractTokenFromHeader(req.headers.authorization);

      if (token) {

        const result = await this.authService.verifyToken(token);
        if (result.success) {
          req.user = result.data;
        }
      }

      next();
    } catch (error) {
      // Continue without authentication if token is invalid
      next();
    }
  }

  /**
   * Middleware to check if user is authenticated
   */
    requireAuth = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    next();
  }

  /**
   * Middleware to check if user owns the resource
   */
  static requireOwnership(userIdParam: string = 'userId') {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const resourceUserId = req.params[userIdParam] || req.body[userIdParam];

      if (req.user.id !== resourceUserId) {
        res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: 'Access denied: You can only access your own resources',
        });
        return;
      }

      next();
    };
  }

  /**
   * Middleware to validate token format
   */
  static validateTokenFormat(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'Authorization header is required',
      });
      return;
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'Authorization header must be in format: Bearer <token>',
      });
      return;
    }

    if (!parts[1] || parts[1].trim() === '') {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'Token cannot be empty',
      });
      return;
    }

    next();
  }

  /**
   * Middleware to check token expiration
   */
  static checkTokenExpiration(req: Request, res: Response, next: NextFunction): void {
    const token = JWTUtils.extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'Access token is required',
      });
      return;
    }

    if (JWTUtils.isTokenExpired(token)) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'Token has expired',
      });
      return;
    }

    next();
  }
}