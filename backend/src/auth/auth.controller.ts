import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { HTTP_STATUS } from '../config/constants';
import { ICustomLogger, LogAction, SummaryError } from '../logger/logger';
import { ResponseToClient } from '../utils/response';

/**
 * Authentication Controller
 * Handles HTTP requests and responses for authentication
 */
export class AuthController {
  constructor(private readonly authService: AuthService, private readonly logger: ICustomLogger) { }
  /**
   * Register a new user
   * POST /auth/register
   */
  register = async (req: Request, res: Response): Promise<void> => {
    const logger = this.logger.init({ module: 'register', sessionId: req.headers['x-session-id'] as string })
    res.setHeader('x-session-id', logger.sessionId());

    const response = new ResponseToClient(res, req, logger, [{
      maskingType: "password",
      maskingField: "body.password"
    },
    {
      maskingType: "email",
      maskingField: "body.email"
    }]);
    try {
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        response.json(HTTP_STATUS.BAD_REQUEST, { success: false, error: 'Username, email, and password are required' });
        return;
      }

      const result = await this.authService.register({ username, email, password });
      const statusCode = result.success ? HTTP_STATUS.CREATED : HTTP_STATUS.BAD_REQUEST;

      response.json(statusCode, result, result.success ? 'success' : 'bad_request');
    } catch (error) {
      console.error('Registration controller error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error'
      });
      logger.error(LogAction.OUTBOUND(`register error`), {
        headers: req.headers,
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        body: { success: false, error: 'Internal server error' }
      });
      logger.flushError(SummaryError.fromError(error));
    }
  }

  /**
   * Login user
   * POST /auth/login
   */
  login = async (req: Request, res: Response): Promise<void> => {
    const logger = this.logger.init({ module: 'login', sessionId: req.headers['x-session-id'] as string })
    res.setHeader('x-session-id', logger.sessionId());

    const response = new ResponseToClient(res, req, logger, [{
      maskingType: "password",
      maskingField: "body.password"
    },
    {
      maskingType: "email",
      maskingField: "body.email"
    }]);
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        response.json(HTTP_STATUS.BAD_REQUEST, { success: false, error: 'Email and password are required' });
        return;
      }

      const result = await this.authService.login({ email, password });
      const statusCode = result.success ? HTTP_STATUS.OK : HTTP_STATUS.UNAUTHORIZED;

      response.json(statusCode, result, result.success ? 'success' : 'unauthorized');
    } catch (error) {
      response.jsonError(HTTP_STATUS.INTERNAL_SERVER_ERROR, { success: false, error: 'Internal server error' }, error);
    }
  }

  /**
   * Logout user
   * POST /auth/logout
   */
  logout = async (req: Request, res: Response): Promise<void> => {
    const logger = this.logger.init({ module: 'logout', sessionId: req.headers['x-session-id'] as string })
    res.setHeader('x-session-id', logger.sessionId());

    const response = new ResponseToClient(res, req, logger);
    try {
      if (!req.user) {
        response.json(HTTP_STATUS.UNAUTHORIZED, { success: false, error: 'User not authenticated' }, "unauthorized");
        return;
      }

      const result = await this.authService.logout(req.user.id);
      const statusCode = result.success ? HTTP_STATUS.OK : HTTP_STATUS.BAD_REQUEST;
      response.json(statusCode, result, result.success ? 'success' : 'bad_request');
    } catch (error) {
      response.jsonError(HTTP_STATUS.INTERNAL_SERVER_ERROR, { success: false, error: 'Internal server error' }, error);
    }
  }

  /**
   * Get current user info
   * GET /auth/me
   */
  getCurrentUser = async (req: Request, res: Response): Promise<void> => {
    const logger = this.logger.init({ module: 'getCurrentUser', sessionId: req.headers['x-session-id'] as string })
    res.setHeader('x-session-id', logger.sessionId());

    const response = new ResponseToClient(res, req, logger);
    try {
      if (!req.user) {
        response.json(HTTP_STATUS.UNAUTHORIZED, { success: false, error: 'User not authenticated' }, "unauthorized");
        return;
      }

      const result = await this.authService.getSessionInfo(req.user.id);
      const statusCode = result.success ? HTTP_STATUS.OK : HTTP_STATUS.NOT_FOUND;

      response.json(statusCode, result, result.success ? 'success' : 'not_found');
    } catch (error) {
      response.jsonError(HTTP_STATUS.INTERNAL_SERVER_ERROR, { success: false, error: 'Internal server error' }, error);
    }
  }

  /**
   * Refresh JWT token
   * POST /auth/refresh
   */
  refreshToken = async (req: Request, res: Response): Promise<void> => {
    const logger = this.logger.init({ module: 'refreshToken', sessionId: req.headers['x-session-id'] as string })
    res.setHeader('x-session-id', logger.sessionId());

    const response = new ResponseToClient(res, req, logger);
    try {
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
        response.json(HTTP_STATUS.BAD_REQUEST, { success: false, error: 'Token is required' }, "bad_request");
        return;
      }

      const result = await this.authService.refreshToken(token);
      const statusCode = result.success ? HTTP_STATUS.OK : HTTP_STATUS.UNAUTHORIZED;

      response.json(statusCode, result, result.success ? 'success' : 'unauthorized');
    } catch (error) {
      response.jsonError(HTTP_STATUS.INTERNAL_SERVER_ERROR, { success: false, error: 'Internal server error' }, error);
    }
  }

  /**
   * Change password for authenticated user
   * POST /auth/change-password
   */
  changePassword = async (req: Request, res: Response): Promise<void> => {
    const logger = this.logger.init({ module: 'changePassword', sessionId: req.headers['x-session-id'] as string })
    res.setHeader('x-session-id', logger.sessionId());

    const response = new ResponseToClient(res, req, logger);
    try {
      if (!req.user) {
        response.json(HTTP_STATUS.UNAUTHORIZED, { success: false, error: 'User not authenticated' }, "unauthorized");
        return;
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        response.json(HTTP_STATUS.BAD_REQUEST, { success: false, error: 'Current password and new password are required' }, "bad_request");
        return;
      }

      const result = await this.authService.changePassword(req.user.id, currentPassword, newPassword);
      const statusCode = result.success ? HTTP_STATUS.OK : HTTP_STATUS.BAD_REQUEST;

      response.json(statusCode, result, result.success ? 'success' : 'bad_request');
    } catch (error) {
      response.jsonError(HTTP_STATUS.INTERNAL_SERVER_ERROR, { success: false, error: 'Internal server error' }, error);
    }
  }
}