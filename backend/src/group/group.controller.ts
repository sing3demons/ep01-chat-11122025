import { Request, Response } from 'express';
import { GroupService } from './group.service';
import { ValidationUtils } from '../utils/validation';

/**
 * Group Controller
 * Handles HTTP requests for group operations
 */
export class GroupController {
  /**
   * Create a new group
   */
  static async createGroup(req: Request, res: Response): Promise<void> {
    try {
      const { name, participantIds } = req.body;
      const createdBy = req.user?.id;

      if (!createdBy) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const groupData = {
        name,
        createdBy,
        participantIds: participantIds || []
      };

      const result = await GroupService.createGroup(groupData);

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Create group controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Add member to group
   */
  static async addMember(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const { userId, role } = req.body;
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const memberData = {
        userId,
        role
      };

      const result = await GroupService.addMember(groupId, memberData, currentUserId);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Add group member controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Remove member from group
   */
  static async removeMember(req: Request, res: Response): Promise<void> {
    try {
      const { groupId, userId } = req.params;
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const result = await GroupService.removeMember(groupId, userId, currentUserId);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Remove group member controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Update member role
   */
  static async updateMemberRole(req: Request, res: Response): Promise<void> {
    try {
      const { groupId, userId } = req.params;
      const { role } = req.body;
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const updateData = { role };

      const result = await GroupService.updateMemberRole(groupId, userId, updateData, currentUserId);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Update member role controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Update group settings
   */
  static async updateGroup(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const { name } = req.body;
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const updateData = { name };

      const result = await GroupService.updateGroup(groupId, updateData, currentUserId);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Update group controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Send message to group
   */
  static async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const { content } = req.body;
      const senderId = req.user?.id;

      if (!senderId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const result = await GroupService.broadcastMessage(groupId, content, senderId);

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Send group message controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get group details
   */
  static async getGroupDetails(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const result = await GroupService.getGroupDetails(groupId, userId);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      console.error('Get group details controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get user's groups
   */
  static async getUserGroups(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const result = await GroupService.getUserGroups(userId, limit, offset);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Get user groups controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Leave group
   */
  static async leaveGroup(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const result = await GroupService.leaveGroup(groupId, userId);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Leave group controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Delete group
   */
  static async deleteGroup(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const result = await GroupService.deleteGroup(groupId, userId);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Delete group controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get group statistics
   */
  static async getGroupStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const result = await GroupService.getGroupStatistics(groupId, userId);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Get group statistics controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}