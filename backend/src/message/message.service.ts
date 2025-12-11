import { MessageRepository } from './message.repository';
import { MessageModel, CreateMessageData, UpdateMessageData, MessageSearchQuery } from './message.model';
import { MessageConverter } from './message.converter';
import { ApiResponse } from '../types';
import { ValidationUtils } from '../utils/validation';
import { WebSocketService } from '../websocket/websocket.service';
import { NotificationService } from '../notification/notification.service';
import { MESSAGE_STATUS } from '../config/constants';

/**
 * Message Service
 * Handles business logic for message operations with real-time WebSocket integration
 */
export class MessageService {
  /**
   * Send a new message with real-time broadcasting
   */
  static async sendMessage(data: CreateMessageData): Promise<ApiResponse> {
    try {
      // Validate message data
      const validation = MessageModel.validateCreateMessage(data);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        };
      }

      // Check if user is participant in the chat room
      const isParticipant = await MessageRepository.isUserParticipantInChatRoom(
        data.senderId,
        data.chatRoomId
      );

      if (!isParticipant) {
        return {
          success: false,
          error: 'User is not a participant in this chat room'
        };
      }

      // Check if sender is blocked by any participants (for direct chats)
      const chatRoomInfo = await MessageRepository.getChatRoomById(data.chatRoomId);
      if (chatRoomInfo?.type === 'direct') {
        const participants = await MessageRepository.getChatRoomParticipants(data.chatRoomId);
        const otherParticipant = participants.find(p => p.userId !== data.senderId);
        
        if (otherParticipant) {
          // Check if sender is blocked by the other participant
          const isBlocked = await MessageRepository.isUserBlocked(otherParticipant.userId, data.senderId);
          // Check if sender has blocked the other participant
          const hasBlocked = await MessageRepository.isUserBlocked(data.senderId, otherParticipant.userId);
          
          if (isBlocked || hasBlocked) {
            return {
              success: false,
              error: 'Cannot send message to blocked user'
            };
          }
        }
      }

      // Create message
      const message = await MessageRepository.createMessage(validation.sanitizedData!);

      // Update chat room's last message timestamp
      await MessageRepository.updateChatRoomLastMessage(data.chatRoomId, message.id);

      // Get message with sender info for broadcasting
      const messageWithSender = await MessageRepository.getMessageByIdWithSender(message.id);

      // Convert to API format
      const apiMessage = MessageConverter.toApiMessageWithSender(messageWithSender);

      // Get chat room participants for real-time broadcasting
      const chatParticipants = await MessageRepository.getChatRoomParticipants(data.chatRoomId);
      
      // Get chat room info for notifications
      const chatRoom = chatRoomInfo;
      const senderInfo = await MessageRepository.getUserById(data.senderId);
      
      // Prepare recipient data for bulk notifications
      const recipientIds: string[] = [];
      const recipientUsernames: Record<string, string> = {};
      
      // Broadcast message to all participants except sender
      const wsService = WebSocketService.getInstance();
      for (const participant of chatParticipants) {
        if (participant.userId !== data.senderId) {
          recipientIds.push(participant.userId);
          
          // Get participant username for mention detection
          const participantUser = await MessageRepository.getUserById(participant.userId);
          if (participantUser) {
            recipientUsernames[participant.userId] = participantUser.username;
          }

          // Send real-time message notification
          await wsService.sendMessageNotification(participant.userId, {
            type: 'new_message',
            message: apiMessage,
            chatRoomId: data.chatRoomId
          });

          // Update message status to delivered for online users
          if (wsService.isUserOnline(participant.userId)) {
            await this.updateMessageStatus(message.id, MESSAGE_STATUS.DELIVERED, participant.userId);
          }
        }
      }

      // Send bulk notifications for the message
      if (recipientIds.length > 0 && senderInfo) {
        await NotificationService.sendBulkMessageNotifications(
          recipientIds,
          data.senderId,
          senderInfo.username,
          validation.sanitizedData!.content,
          data.chatRoomId,
          chatRoom?.name || undefined,
          recipientUsernames
        );
      }

      return {
        success: true,
        data: apiMessage,
        message: 'Message sent successfully'
      };

    } catch (error) {
      console.error('Send message error:', error);
      return {
        success: false,
        error: 'Failed to send message'
      };
    }
  }

  /**
   * Get messages for a chat room
   */
  static async getMessagesByChatRoom(
    chatRoomId: string,
    userId: string,
    limit: number = 50,
    offset: number = 0,
    before?: Date
  ): Promise<ApiResponse> {
    try {
      // Validate chat room ID
      if (!ValidationUtils.isValidUUID(chatRoomId)) {
        return {
          success: false,
          error: 'Invalid chat room ID format'
        };
      }

      // Validate pagination
      if (limit < 1 || limit > 100) {
        return {
          success: false,
          error: 'Limit must be between 1 and 100'
        };
      }

      if (offset < 0) {
        return {
          success: false,
          error: 'Offset must be non-negative'
        };
      }

      // Check if user is participant in the chat room
      const isParticipant = await MessageRepository.isUserParticipantInChatRoom(userId, chatRoomId);

      if (!isParticipant) {
        return {
          success: false,
          error: 'User is not a participant in this chat room'
        };
      }

      // Get messages
      const messages = await MessageRepository.getMessagesByChatRoom(
        chatRoomId,
        limit,
        offset,
        before
      );

      // Convert to API format
      const apiMessages = messages.map(message => MessageConverter.toApiMessageWithSender(message));

      return {
        success: true,
        data: {
          messages: apiMessages,
          pagination: {
            limit,
            offset,
            hasMore: messages.length === limit
          }
        }
      };

    } catch (error) {
      console.error('Get messages by chat room error:', error);
      return {
        success: false,
        error: 'Failed to get messages'
      };
    }
  }

  /**
   * Get message by ID
   */
  static async getMessageById(messageId: string, userId: string): Promise<ApiResponse> {
    try {
      // Validate message ID
      if (!ValidationUtils.isValidUUID(messageId)) {
        return {
          success: false,
          error: 'Invalid message ID format'
        };
      }

      // Get message with sender
      const message = await MessageRepository.getMessageByIdWithSender(messageId);

      if (!message) {
        return {
          success: false,
          error: 'Message not found'
        };
      }

      // Check if user is participant in the chat room
      const isParticipant = await MessageRepository.isUserParticipantInChatRoom(
        userId,
        message.chatRoomId
      );

      if (!isParticipant) {
        return {
          success: false,
          error: 'User is not authorized to view this message'
        };
      }

      // Convert to API format
      const apiMessage = MessageConverter.toApiMessageWithSender(message);

      return {
        success: true,
        data: apiMessage
      };

    } catch (error) {
      console.error('Get message by ID error:', error);
      return {
        success: false,
        error: 'Failed to get message'
      };
    }
  }

  /**
   * Update message
   */
  static async updateMessage(
    messageId: string,
    updateData: UpdateMessageData,
    userId: string
  ): Promise<ApiResponse> {
    try {
      // Validate message ID
      if (!ValidationUtils.isValidUUID(messageId)) {
        return {
          success: false,
          error: 'Invalid message ID format'
        };
      }

      // Validate update data
      const validation = MessageModel.validateUpdateMessage(updateData);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        };
      }

      // Get existing message
      const existingMessage = await MessageRepository.getMessageById(messageId);

      if (!existingMessage) {
        return {
          success: false,
          error: 'Message not found'
        };
      }

      // Check if user is the sender (only sender can edit content)
      if (validation.sanitizedData?.content && existingMessage.senderId !== userId) {
        return {
          success: false,
          error: 'Only the sender can edit message content'
        };
      }

      // Check if user is participant (for status updates)
      const isParticipant = await MessageRepository.isUserParticipantInChatRoom(
        userId,
        existingMessage.chatRoomId
      );

      if (!isParticipant) {
        return {
          success: false,
          error: 'User is not authorized to update this message'
        };
      }

      // Validate status transition if updating status
      if (validation.sanitizedData?.status) {
        const isValidTransition = MessageModel.isValidStatusTransition(
          existingMessage.status as any,
          validation.sanitizedData.status
        );

        if (!isValidTransition) {
          return {
            success: false,
            error: 'Invalid status transition'
          };
        }
      }

      // Update message
      const updatedMessage = await MessageRepository.updateMessage(messageId, validation.sanitizedData!);

      // Convert to API format
      const apiMessage = MessageConverter.toApiMessage(updatedMessage);

      return {
        success: true,
        data: apiMessage,
        message: 'Message updated successfully'
      };

    } catch (error) {
      console.error('Update message error:', error);
      return {
        success: false,
        error: 'Failed to update message'
      };
    }
  }

  /**
   * Delete message
   */
  static async deleteMessage(messageId: string, userId: string): Promise<ApiResponse> {
    try {
      // Validate message ID
      if (!ValidationUtils.isValidUUID(messageId)) {
        return {
          success: false,
          error: 'Invalid message ID format'
        };
      }

      // Get existing message
      const existingMessage = await MessageRepository.getMessageById(messageId);

      if (!existingMessage) {
        return {
          success: false,
          error: 'Message not found'
        };
      }

      // Check if user is the sender or admin
      const isParticipant = await MessageRepository.isUserParticipantInChatRoom(
        userId,
        existingMessage.chatRoomId
      );

      if (!isParticipant) {
        return {
          success: false,
          error: 'User is not authorized to delete this message'
        };
      }

      // Only sender or chat room admin can delete messages
      const canDelete = existingMessage.senderId === userId || 
        await MessageRepository.isUserAdminInChatRoom(userId, existingMessage.chatRoomId);

      if (!canDelete) {
        return {
          success: false,
          error: 'Only the sender or chat room admin can delete messages'
        };
      }

      // Delete message
      await MessageRepository.deleteMessage(messageId);

      return {
        success: true,
        message: 'Message deleted successfully'
      };

    } catch (error) {
      console.error('Delete message error:', error);
      return {
        success: false,
        error: 'Failed to delete message'
      };
    }
  }

  /**
   * Mark message as read
   */
  static async markAsRead(messageId: string, userId: string): Promise<ApiResponse> {
    try {
      // Validate message ID
      if (!ValidationUtils.isValidUUID(messageId)) {
        return {
          success: false,
          error: 'Invalid message ID format'
        };
      }

      // Get existing message
      const existingMessage = await MessageRepository.getMessageById(messageId);

      if (!existingMessage) {
        return {
          success: false,
          error: 'Message not found'
        };
      }

      // Check if user is participant
      const isParticipant = await MessageRepository.isUserParticipantInChatRoom(
        userId,
        existingMessage.chatRoomId
      );

      if (!isParticipant) {
        return {
          success: false,
          error: 'User is not authorized to mark this message as read'
        };
      }

      // Don't mark own messages as read
      if (existingMessage.senderId === userId) {
        return {
          success: true,
          message: 'Cannot mark own message as read'
        };
      }

      // Update message status to read
      const updatedMessage = await MessageRepository.updateMessage(messageId, {
        status: 'read'
      });

      // Convert to API format
      const apiMessage = MessageConverter.toApiMessage(updatedMessage);

      return {
        success: true,
        data: apiMessage,
        message: 'Message marked as read'
      };

    } catch (error) {
      console.error('Mark as read error:', error);
      return {
        success: false,
        error: 'Failed to mark message as read'
      };
    }
  }

  /**
   * Search messages
   */
  static async searchMessages(query: MessageSearchQuery, userId: string): Promise<ApiResponse> {
    try {
      // Validate search query
      const validation = MessageModel.validateSearchQuery(query);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        };
      }

      // If searching in specific chat room, check if user is participant
      if (validation.sanitizedData?.chatRoomId) {
        const isParticipant = await MessageRepository.isUserParticipantInChatRoom(
          userId,
          validation.sanitizedData.chatRoomId
        );

        if (!isParticipant) {
          return {
            success: false,
            error: 'User is not authorized to search in this chat room'
          };
        }
      }

      // Search messages
      const messages = await MessageRepository.searchMessages(validation.sanitizedData!, userId);

      // Convert to API format
      const apiMessages = messages.map(message => MessageConverter.toApiMessageWithSender(message));

      return {
        success: true,
        data: {
          messages: apiMessages,
          pagination: {
            limit: validation.sanitizedData?.limit || 20,
            offset: validation.sanitizedData?.offset || 0,
            total: messages.length
          }
        }
      };

    } catch (error) {
      console.error('Search messages error:', error);
      return {
        success: false,
        error: 'Failed to search messages'
      };
    }
  }

  /**
   * Update message status (delivered/read) with real-time notification
   */
  static async updateMessageStatus(
    messageId: string, 
    status: 'delivered' | 'read', 
    userId: string
  ): Promise<ApiResponse> {
    try {
      // Validate message ID
      if (!ValidationUtils.isValidUUID(messageId)) {
        return {
          success: false,
          error: 'Invalid message ID format'
        };
      }

      // Get existing message
      const existingMessage = await MessageRepository.getMessageById(messageId);

      if (!existingMessage) {
        return {
          success: false,
          error: 'Message not found'
        };
      }

      // Check if user is participant
      const isParticipant = await MessageRepository.isUserParticipantInChatRoom(
        userId,
        existingMessage.chatRoomId
      );

      if (!isParticipant) {
        return {
          success: false,
          error: 'User is not authorized to update this message status'
        };
      }

      // Don't update status for own messages
      if (existingMessage.senderId === userId) {
        return {
          success: true,
          message: 'Cannot update status for own message'
        };
      }

      // Validate status transition
      const isValidTransition = MessageModel.isValidStatusTransition(
        existingMessage.status as any,
        status
      );

      if (!isValidTransition) {
        return {
          success: false,
          error: 'Invalid status transition'
        };
      }

      // Update message status
      const updatedMessage = await MessageRepository.updateMessage(messageId, { status });

      // Send real-time status update to message sender
      const wsService = WebSocketService.getInstance();
      await wsService.sendMessageStatusUpdate(existingMessage.senderId, messageId, status);

      return {
        success: true,
        data: MessageConverter.toApiMessage(updatedMessage),
        message: `Message marked as ${status}`
      };

    } catch (error) {
      console.error('Update message status error:', error);
      return {
        success: false,
        error: 'Failed to update message status'
      };
    }
  }

  /**
   * Handle typing indicator with real-time broadcasting
   */
  static async handleTypingIndicator(
    userId: string,
    chatRoomId: string,
    isTyping: boolean
  ): Promise<ApiResponse> {
    try {
      // Validate inputs
      if (!ValidationUtils.isValidUUID(userId)) {
        return {
          success: false,
          error: 'Invalid user ID format'
        };
      }

      if (!ValidationUtils.isValidUUID(chatRoomId)) {
        return {
          success: false,
          error: 'Invalid chat room ID format'
        };
      }

      // Check if user is participant in the chat room
      const isParticipant = await MessageRepository.isUserParticipantInChatRoom(userId, chatRoomId);

      if (!isParticipant) {
        return {
          success: false,
          error: 'User is not a participant in this chat room'
        };
      }

      // Get chat room participants
      const participants = await MessageRepository.getChatRoomParticipants(chatRoomId);
      
      // Broadcast typing indicator to all participants except the typer
      const wsService = WebSocketService.getInstance();
      for (const participant of participants) {
        if (participant.userId !== userId) {
          await wsService.sendTypingIndicator(chatRoomId, userId, isTyping);
        }
      }

      return {
        success: true,
        message: `Typing indicator ${isTyping ? 'started' : 'stopped'}`
      };

    } catch (error) {
      console.error('Handle typing indicator error:', error);
      return {
        success: false,
        error: 'Failed to handle typing indicator'
      };
    }
  }

  /**
   * Mark messages as delivered for a user when they come online
   */
  static async markMessagesAsDelivered(userId: string, chatRoomId?: string): Promise<ApiResponse> {
    try {
      // Validate user ID
      if (!ValidationUtils.isValidUUID(userId)) {
        return {
          success: false,
          error: 'Invalid user ID format'
        };
      }

      // Get undelivered messages for the user
      const undeliveredMessages = await MessageRepository.getUndeliveredMessagesForUser(
        userId,
        chatRoomId
      );

      const wsService = WebSocketService.getInstance();
      let updatedCount = 0;

      // Update each message to delivered status
      for (const message of undeliveredMessages) {
        // Skip own messages
        if (message.senderId === userId) continue;

        // Update status
        await MessageRepository.updateMessage(message.id, { 
          status: MESSAGE_STATUS.DELIVERED 
        });

        // Notify sender
        await wsService.sendMessageStatusUpdate(
          message.senderId, 
          message.id, 
          MESSAGE_STATUS.DELIVERED
        );

        updatedCount++;
      }

      return {
        success: true,
        data: { updatedCount },
        message: `${updatedCount} messages marked as delivered`
      };

    } catch (error) {
      console.error('Mark messages as delivered error:', error);
      return {
        success: false,
        error: 'Failed to mark messages as delivered'
      };
    }
  }

  /**
   * Get unread message count for a user
   */
  static async getUnreadMessageCount(userId: string, chatRoomId?: string): Promise<ApiResponse> {
    try {
      // Validate user ID
      if (!ValidationUtils.isValidUUID(userId)) {
        return {
          success: false,
          error: 'Invalid user ID format'
        };
      }

      // Validate chat room ID if provided
      if (chatRoomId && !ValidationUtils.isValidUUID(chatRoomId)) {
        return {
          success: false,
          error: 'Invalid chat room ID format'
        };
      }

      // Get unread count
      const unreadCount = await MessageRepository.getUnreadMessageCount(userId, chatRoomId);

      return {
        success: true,
        data: { unreadCount }
      };

    } catch (error) {
      console.error('Get unread message count error:', error);
      return {
        success: false,
        error: 'Failed to get unread message count'
      };
    }
  }

  /**
   * Get recent messages for chat list preview
   */
  static async getRecentMessagesForChatList(userId: string): Promise<ApiResponse> {
    try {
      // Validate user ID
      if (!ValidationUtils.isValidUUID(userId)) {
        return {
          success: false,
          error: 'Invalid user ID format'
        };
      }

      // Get user's chat rooms with recent messages
      const chatRoomsWithMessages = await MessageRepository.getChatRoomsWithRecentMessages(userId);

      // Convert to API format
      const chatList = chatRoomsWithMessages.map(chatRoom => ({
        chatRoomId: chatRoom.id,
        name: chatRoom.name,
        type: chatRoom.type,
        lastMessage: chatRoom.lastMessage ? {
          id: chatRoom.lastMessage.id,
          content: MessageModel.truncateForPreview(chatRoom.lastMessage.content),
          senderId: chatRoom.lastMessage.senderId,
          senderName: chatRoom.lastMessage.sender?.username,
          timestamp: chatRoom.lastMessage.createdAt,
          status: chatRoom.lastMessage.status
        } : null,
        unreadCount: chatRoom.unreadCount || 0,
        lastMessageAt: chatRoom.lastMessageAt
      }));

      return {
        success: true,
        data: { chatList }
      };

    } catch (error) {
      console.error('Get recent messages for chat list error:', error);
      return {
        success: false,
        error: 'Failed to get recent messages for chat list'
      };
    }
  }
}