import { Request, Response } from 'express';
import { UserService } from './user.service';
import { HTTP_STATUS } from '../config/constants';

/**
 * User Controller
 * Handles HTTP requests and responses for user operations
 */
export class UserController {
  /**
   * Get user profile by ID
   * GET /users/:id
   */
  static async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const currentUserId = req.user?.id;

      if (!id) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'User ID is required'
        });
        return;
      }

      const result = await UserService.getUserById(id, currentUserId);

      if (result.success) {
        res.status(HTTP_STATUS.OK).json(result);
      } else {
        res.status(HTTP_STATUS.NOT_FOUND).json(result);
      }
    } catch (error) {
      console.error('Get user by ID controller error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Update user profile
   * PUT /users/:id
   */
  static async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      if (id !== currentUserId) {
        res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: 'Cannot update other user profiles'
        });
        return;
      }

      const result = await UserService.updateUser(id, req.body);

      if (result.success) {
        res.status(HTTP_STATUS.OK).json(result);
      } else {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
      }
    } catch (error) {
      console.error('Update user controller error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Search users by username
   * GET /users/search?q=username
   */
  static async searchUsers(req: Request, res: Response): Promise<void> {
    try {
      const { q: query, limit, offset } = req.query;
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      if (!query || typeof query !== 'string') {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Search query is required'
        });
        return;
      }

      const result = await UserService.searchUsers(
        query,
        currentUserId,
        limit ? parseInt(limit as string) : undefined,
        offset ? parseInt(offset as string) : undefined
      );

      if (result.success) {
        res.status(HTTP_STATUS.OK).json(result);
      } else {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
      }
    } catch (error) {
      console.error('Search users controller error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Update user online status
   * POST /users/:id/status
   */
  static async updateOnlineStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { isOnline } = req.body;
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      if (id !== currentUserId) {
        res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: 'Cannot update other user status'
        });
        return;
      }

      if (typeof isOnline !== 'boolean') {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'isOnline must be a boolean'
        });
        return;
      }

      const result = await UserService.updateOnlineStatus(id, isOnline);

      if (result.success) {
        res.status(HTTP_STATUS.OK).json(result);
      } else {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
      }
    } catch (error) {
      console.error('Update online status controller error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get user privacy settings
   * GET /users/:id/privacy
   */
  static async getPrivacySettings(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      if (id !== currentUserId) {
        res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: 'Cannot access other user privacy settings'
        });
        return;
      }

      const result = await UserService.getPrivacySettings(id);

      if (result.success) {
        res.status(HTTP_STATUS.OK).json(result);
      } else {
        res.status(HTTP_STATUS.NOT_FOUND).json(result);
      }
    } catch (error) {
      console.error('Get privacy settings controller error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Update user privacy settings
   * PUT /users/:id/privacy
   */
  static async updatePrivacySettings(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      if (id !== currentUserId) {
        res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: 'Cannot update other user privacy settings'
        });
        return;
      }

      const result = await UserService.updatePrivacySettings(id, req.body);

      if (result.success) {
        res.status(HTTP_STATUS.OK).json(result);
      } else {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
      }
    } catch (error) {
      console.error('Update privacy settings controller error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get user's contacts
   * GET /users/:id/contacts
   */
  static async getUserContacts(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      if (id !== currentUserId) {
        res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: 'Cannot access other user contacts'
        });
        return;
      }

      const result = await UserService.getUserContacts(id);

      if (result.success) {
        res.status(HTTP_STATUS.OK).json(result);
      } else {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
      }
    } catch (error) {
      console.error('Get user contacts controller error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Add a contact
   * POST /users/:id/contacts
   */
  static async addContact(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { contactId } = req.body;
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      if (id !== currentUserId) {
        res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: 'Cannot add contacts for other users'
        });
        return;
      }

      if (!contactId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Contact ID is required'
        });
        return;
      }

      const result = await UserService.addContact(id, contactId);

      if (result.success) {
        res.status(HTTP_STATUS.CREATED).json(result);
      } else {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
      }
    } catch (error) {
      console.error('Add contact controller error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Remove a contact
   * DELETE /users/:id/contacts/:contactId
   */
  static async removeContact(req: Request, res: Response): Promise<void> {
    try {
      const { id, contactId } = req.params;
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      if (id !== currentUserId) {
        res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: 'Cannot remove contacts for other users'
        });
        return;
      }

      const result = await UserService.removeContact(id, contactId);

      if (result.success) {
        res.status(HTTP_STATUS.OK).json(result);
      } else {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
      }
    } catch (error) {
      console.error('Remove contact controller error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Block a user
   * POST /users/:id/blocked
   */
  static async blockUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { blockedUserId } = req.body;
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      if (id !== currentUserId) {
        res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: 'Cannot block users for other users'
        });
        return;
      }

      if (!blockedUserId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Blocked user ID is required'
        });
        return;
      }

      const result = await UserService.blockUser(id, blockedUserId);

      if (result.success) {
        res.status(HTTP_STATUS.CREATED).json(result);
      } else {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
      }
    } catch (error) {
      console.error('Block user controller error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Unblock a user
   * DELETE /users/:id/blocked/:blockedUserId
   */
  static async unblockUser(req: Request, res: Response): Promise<void> {
    try {
      const { id, blockedUserId } = req.params;
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      if (id !== currentUserId) {
        res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: 'Cannot unblock users for other users'
        });
        return;
      }

      const result = await UserService.unblockUser(id, blockedUserId);

      if (result.success) {
        res.status(HTTP_STATUS.OK).json(result);
      } else {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
      }
    } catch (error) {
      console.error('Unblock user controller error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get blocked users
   * GET /users/:id/blocked
   */
  static async getBlockedUsers(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      if (id !== currentUserId) {
        res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: 'Cannot access other user blocked list'
        });
        return;
      }

      const result = await UserService.getBlockedUsers(id);

      if (result.success) {
        res.status(HTTP_STATUS.OK).json(result);
      } else {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
      }
    } catch (error) {
      console.error('Get blocked users controller error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get mutual contacts
   * GET /users/:id/mutual/:otherUserId
   */
  static async getMutualContacts(req: Request, res: Response): Promise<void> {
    try {
      const { id, otherUserId } = req.params;
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      if (id !== currentUserId) {
        res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: 'Cannot access mutual contacts for other users'
        });
        return;
      }

      const result = await UserService.getMutualContacts(id, otherUserId);

      if (result.success) {
        res.status(HTTP_STATUS.OK).json(result);
      } else {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
      }
    } catch (error) {
      console.error('Get mutual contacts controller error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}