import { Request, Response } from 'express';
import { GroupService } from './group.service';

/**
 * Group Controller
 * Handles HTTP requests for group operations
 */
export class GroupController {
  constructor(private readonly groupService: GroupService) { }
  /**
   * Create a new group
   */
  createGroup = async (req: Request, res: Response): Promise<void> => {
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

      const result = await this.groupService.createGroup(groupData);

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
  addMember = async (req: Request, res: Response): Promise<void> => {
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

      const result = await this.groupService.addMember(groupId, memberData, currentUserId);

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
  removeMember = async (req: Request, res: Response): Promise<void> => {
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

      const result = await this.groupService.removeMember(groupId, userId, currentUserId);

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
  updateMemberRole = async (req: Request, res: Response): Promise<void> => {
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

      const result = await this.groupService.updateMemberRole(groupId, userId, updateData, currentUserId);

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
  updateGroup = async (req: Request, res: Response): Promise<void> => {
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

      const result = await this.groupService.updateGroup(groupId, updateData, currentUserId);

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
  sendMessage = async (req: Request, res: Response): Promise<void> => {
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

      const result = await this.groupService.broadcastMessage(groupId, content, senderId);

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
  getGroupDetails = async (req: Request, res: Response): Promise<void> => {
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

      const result = await this.groupService.getGroupDetails(groupId, userId);

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
  getUserGroups = async (req: Request, res: Response): Promise<void> => {
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

      const result = await this.groupService.getUserGroups(userId, limit, offset);

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
  leaveGroup = async (req: Request, res: Response): Promise<void> => {
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

      const result = await this.groupService.leaveGroup(groupId, userId);

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
  deleteGroup = async (req: Request, res: Response): Promise<void> => {
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

      const result = await this.groupService.deleteGroup(groupId, userId);

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
  getGroupStatistics = async (req: Request, res: Response): Promise<void> => {
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

      const result = await this.groupService.getGroupStatistics(groupId, userId);

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