import { Router } from 'express';
import { GroupController } from './group.controller';
import { AuthMiddleware } from '../middleware/auth';

/**
 * Group Routes
 * Defines all HTTP routes for group operations
 */
const router = Router();

// Apply authentication middleware to all group routes
router.use(AuthMiddleware.authenticate);

/**
 * @route   POST /api/groups
 * @desc    Create a new group
 * @access  Private
 * @body    { name: string, participantIds: string[] }
 */
router.post('/', GroupController.createGroup);

/**
 * @route   GET /api/groups
 * @desc    Get user's groups
 * @access  Private
 * @query   { limit?: number, offset?: number }
 */
router.get('/', GroupController.getUserGroups);

/**
 * @route   GET /api/groups/:groupId
 * @desc    Get group details
 * @access  Private
 */
router.get('/:groupId', GroupController.getGroupDetails);

/**
 * @route   PUT /api/groups/:groupId
 * @desc    Update group settings
 * @access  Private (Admin only)
 * @body    { name?: string }
 */
router.put('/:groupId', GroupController.updateGroup);

/**
 * @route   DELETE /api/groups/:groupId
 * @desc    Delete group
 * @access  Private (Admin/Creator only)
 */
router.delete('/:groupId', GroupController.deleteGroup);

/**
 * @route   POST /api/groups/:groupId/members
 * @desc    Add member to group
 * @access  Private (Admin only)
 * @body    { userId: string, role?: 'admin' | 'member' }
 */
router.post('/:groupId/members', GroupController.addMember);

/**
 * @route   DELETE /api/groups/:groupId/members/:userId
 * @desc    Remove member from group
 * @access  Private (Admin only or self-removal)
 */
router.delete('/:groupId/members/:userId', GroupController.removeMember);

/**
 * @route   PUT /api/groups/:groupId/members/:userId/role
 * @desc    Update member role
 * @access  Private (Admin only)
 * @body    { role: 'admin' | 'member' }
 */
router.put('/:groupId/members/:userId/role', GroupController.updateMemberRole);

/**
 * @route   POST /api/groups/:groupId/messages
 * @desc    Send message to group
 * @access  Private (Members only)
 * @body    { content: string }
 */
router.post('/:groupId/messages', GroupController.sendMessage);

/**
 * @route   POST /api/groups/:groupId/leave
 * @desc    Leave group
 * @access  Private
 */
router.post('/:groupId/leave', GroupController.leaveGroup);

/**
 * @route   GET /api/groups/:groupId/statistics
 * @desc    Get group statistics
 * @access  Private (Members only)
 */
router.get('/:groupId/statistics', GroupController.getGroupStatistics);

export default router;