import { MessageService } from '../message.service';
import { MessageRepository } from '../message.repository';
import { WebSocketService } from '../../websocket/websocket.service';

// Mock dependencies
jest.mock('../message.repository');
jest.mock('../../websocket/websocket.service', () => ({
  WebSocketService: {
    getInstance: jest.fn(() => ({
      sendMessageNotification: jest.fn(),
      sendTypingIndicator: jest.fn(),
      sendMessageStatusUpdate: jest.fn(),
      isUserOnline: jest.fn()
    }))
  }
}));

const mockMessageRepository = MessageRepository as jest.Mocked<typeof MessageRepository>;
const mockWebSocketService = {
  sendMessageNotification: jest.fn(),
  sendTypingIndicator: jest.fn(),
  sendMessageStatusUpdate: jest.fn(),
  isUserOnline: jest.fn()
};

// Mock WebSocketService.getInstance to return our mock
(WebSocketService.getInstance as jest.Mock).mockReturnValue(mockWebSocketService);

describe('MessageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('should send message successfully with real-time broadcasting', async () => {
      // Mock data
      const messageData = {
        content: 'Hello, World!',
        senderId: '550e8400-e29b-41d4-a716-446655440000',
        chatRoomId: '550e8400-e29b-41d4-a716-446655440001'
      };

      const mockMessage = {
        id: '550e8400-e29b-41d4-a716-446655440002',
        content: 'Hello, World!',
        senderId: '550e8400-e29b-41d4-a716-446655440000',
        chatRoomId: '550e8400-e29b-41d4-a716-446655440001',
        status: 'sent',
        createdAt: new Date()
      };

      const mockMessageWithSender = {
        ...mockMessage,
        sender: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          username: 'testuser',
          isOnline: true
        }
      };

      const mockParticipants = [
        { userId: '550e8400-e29b-41d4-a716-446655440000', user: { id: '550e8400-e29b-41d4-a716-446655440000', username: 'testuser', isOnline: true } },
        { userId: '550e8400-e29b-41d4-a716-446655440003', user: { id: '550e8400-e29b-41d4-a716-446655440003', username: 'otheruser', isOnline: true } }
      ];

      // Setup mocks
      mockMessageRepository.isUserParticipantInChatRoom.mockResolvedValue(true);
      mockMessageRepository.createMessage.mockResolvedValue(mockMessage);
      mockMessageRepository.updateChatRoomLastMessage.mockResolvedValue({} as any);
      mockMessageRepository.getMessageByIdWithSender.mockResolvedValue(mockMessageWithSender);
      mockMessageRepository.getChatRoomParticipants.mockResolvedValue(mockParticipants);
      mockWebSocketService.isUserOnline.mockReturnValue(true);
      mockWebSocketService.sendMessageNotification.mockResolvedValue(undefined);

      // Execute
      const result = await MessageService.sendMessage(messageData);

      // Verify
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(mockMessageRepository.createMessage).toHaveBeenCalledWith(messageData);
      expect(mockWebSocketService.sendMessageNotification).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440003',
        expect.objectContaining({
          type: 'new_message',
          chatRoomId: '550e8400-e29b-41d4-a716-446655440001'
        })
      );
    });

    it('should fail if user is not participant', async () => {
      const messageData = {
        content: 'Hello, World!',
        senderId: '550e8400-e29b-41d4-a716-446655440000',
        chatRoomId: '550e8400-e29b-41d4-a716-446655440001'
      };

      mockMessageRepository.isUserParticipantInChatRoom.mockResolvedValue(false);

      const result = await MessageService.sendMessage(messageData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User is not a participant in this chat room');
    });

    it('should fail with invalid message data', async () => {
      const messageData = {
        content: '',
        senderId: 'user-1',
        chatRoomId: 'room-1'
      };

      const result = await MessageService.sendMessage(messageData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Message content is required');
    });
  });

  describe('handleTypingIndicator', () => {
    it('should handle typing indicator successfully', async () => {
      const mockParticipants = [
        { userId: '550e8400-e29b-41d4-a716-446655440000', user: { id: '550e8400-e29b-41d4-a716-446655440000', username: 'testuser', isOnline: true } },
        { userId: '550e8400-e29b-41d4-a716-446655440003', user: { id: '550e8400-e29b-41d4-a716-446655440003', username: 'otheruser', isOnline: true } }
      ];

      mockMessageRepository.isUserParticipantInChatRoom.mockResolvedValue(true);
      mockMessageRepository.getChatRoomParticipants.mockResolvedValue(mockParticipants);
      mockWebSocketService.sendTypingIndicator.mockResolvedValue(undefined);

      const result = await MessageService.handleTypingIndicator('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', true);

      expect(result.success).toBe(true);
      expect(mockWebSocketService.sendTypingIndicator).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', true);
    });

    it('should fail if user is not participant', async () => {
      mockMessageRepository.isUserParticipantInChatRoom.mockResolvedValue(false);

      const result = await MessageService.handleTypingIndicator('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', true);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User is not a participant in this chat room');
    });
  });

  describe('updateMessageStatus', () => {
    it('should update message status successfully', async () => {
      const mockMessage = {
        id: '550e8400-e29b-41d4-a716-446655440002',
        content: 'Hello',
        senderId: '550e8400-e29b-41d4-a716-446655440000',
        chatRoomId: '550e8400-e29b-41d4-a716-446655440001',
        status: 'sent',
        createdAt: new Date()
      };

      const mockUpdatedMessage = {
        ...mockMessage,
        status: 'read'
      };

      mockMessageRepository.getMessageById.mockResolvedValue(mockMessage);
      mockMessageRepository.isUserParticipantInChatRoom.mockResolvedValue(true);
      mockMessageRepository.updateMessage.mockResolvedValue(mockUpdatedMessage);
      mockWebSocketService.sendMessageStatusUpdate.mockResolvedValue(undefined);

      const result = await MessageService.updateMessageStatus('550e8400-e29b-41d4-a716-446655440002', 'read', '550e8400-e29b-41d4-a716-446655440003');

      expect(result.success).toBe(true);
      expect(mockWebSocketService.sendMessageStatusUpdate).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002', 'read');
    });

    it('should not update status for own messages', async () => {
      const mockMessage = {
        id: '550e8400-e29b-41d4-a716-446655440002',
        content: 'Hello',
        senderId: '550e8400-e29b-41d4-a716-446655440000',
        chatRoomId: '550e8400-e29b-41d4-a716-446655440001',
        status: 'sent',
        createdAt: new Date()
      };

      mockMessageRepository.getMessageById.mockResolvedValue(mockMessage);
      mockMessageRepository.isUserParticipantInChatRoom.mockResolvedValue(true);

      const result = await MessageService.updateMessageStatus('550e8400-e29b-41d4-a716-446655440002', 'read', '550e8400-e29b-41d4-a716-446655440000');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Cannot update status for own message');
    });
  });

  describe('getUnreadMessageCount', () => {
    it('should get unread message count successfully', async () => {
      mockMessageRepository.getUnreadMessageCount.mockResolvedValue(5);

      const result = await MessageService.getUnreadMessageCount('550e8400-e29b-41d4-a716-446655440000');

      expect(result.success).toBe(true);
      expect(result.data?.unreadCount).toBe(5);
    });

    it('should fail with invalid user ID', async () => {
      const result = await MessageService.getUnreadMessageCount('invalid-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid user ID format');
    });
  });
});