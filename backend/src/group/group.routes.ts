import { Router } from 'express';
import { GroupController } from './group.controller';
import { GroupService } from './group.service';
import { ChatRoomService } from '../chatroom/chatroom.service';
import { ChatRoomRepository } from '../chatroom/chatroom.repository';
import { MessageService } from '../message/message.service';
import { MessageRepository } from '../message/message.repository';
import { AuthMiddleware } from '../middleware/auth';

/**
 * Group Routes
 * Defines all HTTP routes for group operations
 */
const router = Router();

// Create dependencies
const chatRoomRepository = new ChatRoomRepository();
const messageRepository = new MessageRepository();
const chatRoomService = new ChatRoomService(chatRoomRepository);
const messageService = new MessageService(messageRepository);
const groupService = new GroupService(chatRoomService, messageService, chatRoomRepository);
const groupController = new GroupController(groupService);

// Apply authentication middleware to all group routes
router.use(AuthMiddleware.authenticate);

/**
 * @route   POST /api/groups
 * @desc    Create a new group
 * @access  Private
 * @body    { name: string, participantIds: string[] }
 */
router.post('/', groupController.createGroup);

/**
 * @route   GET /api/groups
 * @desc    Get user's groups
 * @access  Private
 * @query   { limit?: number, offset?: number }
 */
router.get('/', groupController.getUserGroups);

/**
 * @route   GET /api/groups/:groupId
 * @desc    Get group details
 * @access  Private
 */
router.get('/:groupId', groupController.getGroupDetails);

/**
 * @route   PUT /api/groups/:groupId
 * @desc    Update group settings
 * @access  Private (Admin only)
 * @body    { name?: string }
 */
router.put('/:groupId', groupController.updateGroup);

/**
 * @route   DELETE /api/groups/:groupId
 * @desc    Delete group
 * @access  Private (Admin/Creator only)
 */
router.delete('/:groupId', groupController.deleteGroup);

/**
 * @route   POST /api/groups/:groupId/members
 * @desc    Add member to group
 * @access  Private (Admin only)
 * @body    { userId: string, role?: 'admin' | 'member' }
 */
router.post('/:groupId/members', groupController.addMember);

/**
 * @route   DELETE /api/groups/:groupId/members/:userId
 * @desc    Remove member from group
 * @access  Private (Admin only or self-removal)
 */
router.delete('/:groupId/members/:userId', groupController.removeMember);

/**
 * @route   PUT /api/groups/:groupId/members/:userId/role
 * @desc    Update member role
 * @access  Private (Admin only)
 * @body    { role: 'admin' | 'member' }
 */
router.put('/:groupId/members/:userId/role', groupController.updateMemberRole);

/**
 * @route   POST /api/groups/:groupId/messages
 * @desc    Send message to group
 * @access  Private (Members only)
 * @body    { content: string }
 */
router.post('/:groupId/messages', groupController.sendMessage);

/**
 * @route   POST /api/groups/:groupId/leave
 * @desc    Leave group
 * @access  Private
 */
router.post('/:groupId/leave', groupController.leaveGroup);

/**
 * @route   GET /api/groups/:groupId/statistics
 * @desc    Get group statistics
 * @access  Private (Members only)
 */
router.get('/:groupId/statistics', groupController.getGroupStatistics);

export default router;