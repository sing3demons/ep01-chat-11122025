import { Request, Response } from 'express';
import { MessageService } from './message.service';
import { HTTP_STATUS } from '../config/constants';

/**
 * Message Controller
 * Handles HTTP requests and responses for message operations
 */
export class MessageController {
  constructor(private readonly messageService: MessageService) { }
  /**
   * Send a new message
   * POST /messages
   */
  sendMessage = async (req: Request, res: Response): Promise<void> => {
    try {
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const messageData = {
        ...req.body,
        senderId: currentUserId
      };

      const result = await this.messageService.sendMessage(messageData);

      if (result.success) {
        res.status(HTTP_STATUS.CREATED).json(result);
      } else {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
      }
    } catch (error) {
      console.error('Send message controller error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get messages for a chat room
   * GET /messages/chatroom/:chatRoomId
   */
  getMessagesByChatRoom = async (req: Request, res: Response): Promise<void> => {
    try {
      const { chatRoomId } = req.params;
      const { limit, offset, before } = req.query;
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      if (!chatRoomId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Chat room ID is required'
        });
        return;
      }

      const result = await this.messageService.getMessagesByChatRoom(
        chatRoomId,
        currentUserId,
        limit ? parseInt(limit as string) : undefined,
        offset ? parseInt(offset as string) : undefined,
        before ? new Date(before as string) : undefined
      );

      if (result.success) {
        res.status(HTTP_STATUS.OK).json(result);
      } else {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
      }
    } catch (error) {
      console.error('Get messages by chat room controller error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get message by ID
   * GET /messages/:id
   */
  getMessageById = async (req: Request, res: Response): Promise<void> => {
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

      if (!id) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Message ID is required'
        });
        return;
      }

      const result = await this.messageService.getMessageById(id, currentUserId);

      if (result.success) {
        res.status(HTTP_STATUS.OK).json(result);
      } else {
        res.status(HTTP_STATUS.NOT_FOUND).json(result);
      }
    } catch (error) {
      console.error('Get message by ID controller error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Update message
   * PUT /messages/:id
   */
  updateMessage = async (req: Request, res: Response): Promise<void> => {
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

      if (!id) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Message ID is required'
        });
        return;
      }

      const result = await this.messageService.updateMessage(id, req.body, currentUserId);

      if (result.success) {
        res.status(HTTP_STATUS.OK).json(result);
      } else {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
      }
    } catch (error) {
      console.error('Update message controller error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Delete message
   * DELETE /messages/:id
   */
  deleteMessage = async (req: Request, res: Response): Promise<void> => {
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

      if (!id) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Message ID is required'
        });
        return;
      }

      const result = await this.messageService.deleteMessage(id, currentUserId);

      if (result.success) {
        res.status(HTTP_STATUS.OK).json(result);
      } else {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
      }
    } catch (error) {
      console.error('Delete message controller error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Mark message as read
   * POST /messages/:id/read
   */
  markAsRead = async (req: Request, res: Response): Promise<void> => {
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

      if (!id) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Message ID is required'
        });
        return;
      }

      const result = await this.messageService.markAsRead(id, currentUserId);

      if (result.success) {
        res.status(HTTP_STATUS.OK).json(result);
      } else {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
      }
    } catch (error) {
      console.error('Mark as read controller error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Search messages
   * GET /messages/search
   */
  searchMessages = async (req: Request, res: Response): Promise<void> => {
    try {
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const searchQuery = {
        query: req.query.q as string,
        chatRoomId: req.query.chatRoomId as string,
        senderId: req.query.senderId as string,
        fromDate: req.query.fromDate ? new Date(req.query.fromDate as string) : undefined,
        toDate: req.query.toDate ? new Date(req.query.toDate as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
      };

      const result = await this.messageService.searchMessages(searchQuery, currentUserId);

      if (result.success) {
        res.status(HTTP_STATUS.OK).json(result);
      } else {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
      }
    } catch (error) {
      console.error('Search messages controller error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Handle typing indicator
   * POST /messages/typing
   */
  handleTypingIndicator = async (req: Request, res: Response): Promise<void> => {
    try {
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const { chatRoomId, isTyping } = req.body;

      if (!chatRoomId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Chat room ID is required'
        });
        return;
      }

      if (typeof isTyping !== 'boolean') {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'isTyping must be a boolean'
        });
        return;
      }

      const result = await this.messageService.handleTypingIndicator(
        currentUserId,
        chatRoomId,
        isTyping
      );

      if (result.success) {
        res.status(HTTP_STATUS.OK).json(result);
      } else {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
      }
    } catch (error) {
      console.error('Handle typing indicator controller error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Update message status
   * PUT /messages/:id/status
   */
  updateMessageStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      if (!id) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Message ID is required'
        });
        return;
      }

      if (!status || !['delivered', 'read'].includes(status)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Valid status (delivered or read) is required'
        });
        return;
      }

      const result = await this.messageService.updateMessageStatus(id, status, currentUserId);

      if (result.success) {
        res.status(HTTP_STATUS.OK).json(result);
      } else {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
      }
    } catch (error) {
      console.error('Update message status controller error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get unread message count
   * GET /messages/unread-count
   */
  getUnreadCount = async (req: Request, res: Response): Promise<void> => {
    try {
      const currentUserId = req.user?.id;
      const { chatRoomId } = req.query;

      if (!currentUserId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const result = await this.messageService.getUnreadMessageCount(
        currentUserId,
        chatRoomId as string
      );

      if (result.success) {
        res.status(HTTP_STATUS.OK).json(result);
      } else {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
      }
    } catch (error) {
      console.error('Get unread count controller error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Mark messages as delivered
   * POST /messages/mark-delivered
   */
  markMessagesAsDelivered = async (req: Request, res: Response): Promise<void> => {
    try {
      const currentUserId = req.user?.id;
      const { chatRoomId } = req.body;

      if (!currentUserId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const result = await this.messageService.markMessagesAsDelivered(currentUserId, chatRoomId);

      if (result.success) {
        res.status(HTTP_STATUS.OK).json(result);
      } else {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
      }
    } catch (error) {
      console.error('Mark messages as delivered controller error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get chat list with recent messages
   * GET /messages/chat-list
   */
  getChatList = async (req: Request, res: Response): Promise<void> => {
    try {
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const result = await this.messageService.getRecentMessagesForChatList(currentUserId);

      if (result.success) {
        res.status(HTTP_STATUS.OK).json(result);
      } else {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
      }
    } catch (error) {
      console.error('Get chat list controller error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}