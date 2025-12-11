import * as fc from 'fast-check';
import { MessageService } from '../message.service';
import { MessageRepository } from '../message.repository';
import { WebSocketService } from '../../websocket/websocket.service';
import { NotificationService } from '../../notification/notification.service';
import { CreateMessageData, MessageStatus } from '../message.model';
import { MESSAGE_STATUS } from '../../config/constants';
import { ValidationUtils } from '../../utils/validation';

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

jest.mock('../../notification/notification.service');

const mockMessageRepository = new MessageRepository() as jest.Mocked<MessageRepository>;
const mockNotificationService = new NotificationService({} as any) as jest.Mocked<NotificationService>;
let mockWebSocketService: {
  sendMessageNotification: jest.Mock;
  sendTypingIndicator: jest.Mock;
  sendMessageStatusUpdate: jest.Mock;
  isUserOnline: jest.Mock;
};

// Mock WebSocketService.getInstance - will be set in beforeEach

// Mock OfflineService
jest.mock('../../websocket/offline.service', () => ({
  OfflineService: {
    getInstance: jest.fn(() => ({
      queueMessage: jest.fn()
    }))
  }
}));

describe('MessageService Property-Based Tests', () => {
  let messageService: MessageService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    
    // Create fresh mock WebSocket service for each test
    mockWebSocketService = {
      sendMessageNotification: jest.fn(),
      sendTypingIndicator: jest.fn(),
      sendMessageStatusUpdate: jest.fn(),
      isUserOnline: jest.fn()
    };
    
    // Ensure WebSocketService.getInstance returns our fresh mock
    (WebSocketService.getInstance as jest.Mock).mockReturnValue(mockWebSocketService);
    
    messageService = new MessageService(mockMessageRepository, mockNotificationService);
  });

  /**
   * **Feature: whatsapp-chat-system, Property 1: Message delivery consistency**
   * For any valid message sent between users, the message should be delivered to the intended recipient(s) 
   * and appear in their chat interface with correct sender and timestamp information
   * **Validates: Requirements 1.1, 1.2**
   */
  describe('Property 1: Message delivery consistency', () => {
    it('should deliver any valid message to intended recipients with correct metadata', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate valid message data
          fc.record({
            content: fc.string({ minLength: 1, maxLength: 100 })
              .filter(s => s.trim().length > 0)
              .filter(s => ValidationUtils.sanitizeString(s).length > 0), // Ensure content survives sanitization
            senderId: fc.uuid(),
            chatRoomId: fc.uuid()
          }),
          // Generate recipient data (limit to avoid too many calls)
          fc.array(fc.uuid(), { minLength: 1, maxLength: 3 }),
          async (messageData: CreateMessageData, recipientIds: string[]) => {
            // Ensure recipients are unique and different from sender
            const uniqueRecipients = [...new Set(recipientIds)].filter(id => id !== messageData.senderId);
            if (uniqueRecipients.length === 0) return; // Skip if no valid recipients

            // Setup: Mock successful validation and participant checks
            const mockMessage = {
              id: fc.sample(fc.uuid(), 1)[0],
              ...messageData,
              status: MESSAGE_STATUS.SENT,
              createdAt: new Date()
            };

            const mockMessageWithSender = {
              ...mockMessage,
              sender: {
                id: messageData.senderId,
                username: `user_${messageData.senderId.slice(0, 8)}`,
                isOnline: true
              }
            };

            const mockParticipants = [
              { userId: messageData.senderId, user: { id: messageData.senderId, username: 'sender', isOnline: true } },
              ...uniqueRecipients.map(id => ({ 
                userId: id, 
                user: { id, username: `user_${id.slice(0, 8)}`, isOnline: true } 
              }))
            ];

            const mockChatRoom = {
              id: messageData.chatRoomId,
              type: 'group' as const,
              name: 'Test Group',
              createdAt: new Date(),
              createdBy: messageData.senderId,
              lastMessageAt: new Date()
            };

            const mockSenderInfo = {
              id: messageData.senderId,
              username: 'sender'
            };

            // Create fresh mocks for this test iteration
            const freshWebSocketService = {
              sendMessageNotification: jest.fn().mockResolvedValue(undefined),
              sendTypingIndicator: jest.fn().mockResolvedValue(undefined),
              sendMessageStatusUpdate: jest.fn().mockResolvedValue(undefined),
              isUserOnline: jest.fn().mockReturnValue(true)
            };
            
            // Setup mocks
            mockMessageRepository.isUserParticipantInChatRoom.mockResolvedValue(true);
            mockMessageRepository.getChatRoomById.mockResolvedValue(mockChatRoom);
            mockMessageRepository.createMessage.mockResolvedValue(mockMessage);
            mockMessageRepository.updateChatRoomLastMessage.mockResolvedValue({} as any);
            mockMessageRepository.getMessageByIdWithSender.mockResolvedValue(mockMessageWithSender);
            mockMessageRepository.getChatRoomParticipants.mockResolvedValue(mockParticipants);
            mockMessageRepository.getUserById.mockResolvedValue(mockSenderInfo);
            mockNotificationService.sendBulkMessageNotifications.mockResolvedValue({ success: true });
            
            // Override WebSocketService.getInstance for this test
            (WebSocketService.getInstance as jest.Mock).mockReturnValue(freshWebSocketService);

            // Execute
            const result = await messageService.sendMessage(messageData);

            // Verify: Message delivery consistency properties
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            
            // Property: Message should be created with correct data
            expect(mockMessageRepository.createMessage).toHaveBeenCalledWith(
              expect.objectContaining({
                content: ValidationUtils.sanitizeString(messageData.content.trim()),
                senderId: messageData.senderId,
                chatRoomId: messageData.chatRoomId
              })
            );

            // Property: Message should be delivered to all recipients except sender
            const expectedRecipientCalls = uniqueRecipients.length;
            
            // Debug: Check if the test should pass
            if (result.success) {
              expect(freshWebSocketService.sendMessageNotification).toHaveBeenCalledTimes(expectedRecipientCalls);
            }

            // Property: Chat room last message timestamp should be updated
            expect(mockMessageRepository.updateChatRoomLastMessage).toHaveBeenCalledWith(
              messageData.chatRoomId,
              mockMessage.id
            );
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * **Feature: whatsapp-chat-system, Property 2: Message status lifecycle**
   * For any message sent in the system, the status should progress logically from 'sent' → 'delivered' → 'read' 
   * and never regress to a previous state
   * **Validates: Requirements 1.4, 1.5**
   */
  describe('Property 2: Message status lifecycle', () => {
    it('should only allow forward progression of message status', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // messageId
          fc.uuid(), // userId
          fc.constantFrom('sent', 'delivered', 'read') as fc.Arbitrary<MessageStatus>, // currentStatus
          fc.constantFrom('delivered', 'read') as fc.Arbitrary<'delivered' | 'read'>, // newStatus
          async (messageId: string, userId: string, currentStatus: MessageStatus, newStatus: 'delivered' | 'read') => {
            const mockMessage = {
              id: messageId,
              content: 'Test message',
              senderId: fc.sample(fc.uuid(), 1)[0], // Different from userId
              chatRoomId: fc.sample(fc.uuid(), 1)[0],
              status: currentStatus,
              createdAt: new Date()
            };

            const mockUpdatedMessage = {
              ...mockMessage,
              status: newStatus
            };

            // Setup mocks
            mockMessageRepository.getMessageById.mockResolvedValue(mockMessage);
            mockMessageRepository.isUserParticipantInChatRoom.mockResolvedValue(true);
            mockMessageRepository.updateMessage.mockResolvedValue(mockUpdatedMessage);
            mockWebSocketService.sendMessageStatusUpdate.mockResolvedValue(undefined);
            
            // Ensure WebSocketService.getInstance returns our mock for this test
            (WebSocketService.getInstance as jest.Mock).mockReturnValue(mockWebSocketService);

            // Execute
            const result = await messageService.updateMessageStatus(messageId, newStatus, userId);

            // Verify: Status lifecycle property
            const statusOrder = ['sent', 'delivered', 'read'];
            const currentIndex = statusOrder.indexOf(currentStatus);
            const newIndex = statusOrder.indexOf(newStatus);
            
            if (newIndex >= currentIndex) {
              // Valid transition: should succeed
              expect(result.success).toBe(true);
              expect(mockMessageRepository.updateMessage).toHaveBeenCalledWith(
                messageId,
                { status: newStatus }
              );
              expect(mockWebSocketService.sendMessageStatusUpdate).toHaveBeenCalledWith(
                mockMessage.senderId,
                messageId,
                newStatus
              );
            } else {
              // Invalid transition: should fail
              expect(result.success).toBe(false);
              expect(result.error).toContain('Invalid status transition');
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should not allow status updates for own messages', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // messageId
          fc.uuid(), // senderId (same as userId)
          fc.constantFrom('delivered', 'read') as fc.Arbitrary<'delivered' | 'read'>, // newStatus
          async (messageId: string, senderId: string, newStatus: 'delivered' | 'read') => {
            const mockMessage = {
              id: messageId,
              content: 'Test message',
              senderId: senderId, // Same as the user trying to update
              chatRoomId: fc.sample(fc.uuid(), 1)[0],
              status: 'sent' as MessageStatus,
              createdAt: new Date()
            };

            // Setup mocks
            mockMessageRepository.getMessageById.mockResolvedValue(mockMessage);
            mockMessageRepository.isUserParticipantInChatRoom.mockResolvedValue(true);

            // Execute: User trying to update their own message status
            const result = await messageService.updateMessageStatus(messageId, newStatus, senderId);

            // Verify: Property that users cannot update their own message status
            expect(result.success).toBe(true);
            expect(result.message).toBe('Cannot update status for own message');
            expect(mockMessageRepository.updateMessage).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  /**
   * **Feature: whatsapp-chat-system, Property 3: Typing indicator synchronization**
   * For any user typing in a chat, all other participants in that chat should see the typing indicator 
   * while typing is active
   * **Validates: Requirements 1.3**
   */
  describe('Property 3: Typing indicator synchronization', () => {
    it('should broadcast typing indicators to all participants except the typer', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // typingUserId
          fc.uuid(), // chatRoomId
          fc.boolean(), // isTyping
          fc.array(fc.uuid(), { minLength: 1, maxLength: 3 }), // otherParticipants
          async (typingUserId: string, chatRoomId: string, isTyping: boolean, otherParticipants: string[]) => {
            // Ensure typing user is not in other participants and participants are unique
            const filteredParticipants = [...new Set(otherParticipants)].filter(id => id !== typingUserId);
            
            const mockParticipants = [
              { userId: typingUserId, user: { id: typingUserId, username: 'typer', isOnline: true } },
              ...filteredParticipants.map(id => ({ 
                userId: id, 
                user: { id, username: `user_${id.slice(0, 8)}`, isOnline: true } 
              }))
            ];

            // Create fresh mocks for this test iteration
            const freshWebSocketService = {
              sendMessageNotification: jest.fn().mockResolvedValue(undefined),
              sendTypingIndicator: jest.fn().mockResolvedValue(undefined),
              sendMessageStatusUpdate: jest.fn().mockResolvedValue(undefined),
              isUserOnline: jest.fn().mockReturnValue(true)
            };
            
            // Setup mocks
            mockMessageRepository.isUserParticipantInChatRoom.mockResolvedValue(true);
            mockMessageRepository.getChatRoomParticipants.mockResolvedValue(mockParticipants);
            
            // Override WebSocketService.getInstance for this test
            (WebSocketService.getInstance as jest.Mock).mockReturnValue(freshWebSocketService);

            // Execute
            const result = await messageService.handleTypingIndicator(typingUserId, chatRoomId, isTyping);

            // Verify: Typing indicator synchronization property
            expect(result.success).toBe(true);

            // Property: Typing indicator should be sent to all participants except the typer
            if (result.success) {
              expect(freshWebSocketService.sendTypingIndicator).toHaveBeenCalledTimes(filteredParticipants.length);
            }

            // Property: Each call should have correct parameters
            if (filteredParticipants.length > 0 && result.success) {
              expect(freshWebSocketService.sendTypingIndicator).toHaveBeenCalledWith(
                chatRoomId,
                typingUserId,
                isTyping
              );
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle typing indicators for users not in chat room', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // nonParticipantUserId
          fc.uuid(), // chatRoomId
          fc.boolean(), // isTyping
          async (nonParticipantUserId: string, chatRoomId: string, isTyping: boolean) => {
            // Setup: User is not a participant
            mockMessageRepository.isUserParticipantInChatRoom.mockResolvedValue(false);

            // Execute
            const result = await messageService.handleTypingIndicator(nonParticipantUserId, chatRoomId, isTyping);

            // Verify: Property that non-participants cannot send typing indicators
            expect(result.success).toBe(false);
            expect(result.error).toBe('User is not a participant in this chat room');
            expect(mockWebSocketService.sendTypingIndicator).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  /**
   * **Feature: whatsapp-chat-system, Property 11: Message search accuracy**
   * For any search query in chat history, all returned results should contain the search terms 
   * and be relevant to the query
   * **Validates: Requirements 4.2**
   */
  describe('Property 11: Message search accuracy', () => {
    it('should return only messages containing search terms', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate valid search queries that won't be filtered out by sanitization
          fc.string({ minLength: 2, maxLength: 20 })
            .filter(s => /^[a-zA-Z0-9\s]+$/.test(s)) // Only alphanumeric and spaces
            .filter(s => s.trim().length >= 2), // searchQuery
          fc.uuid(), // userId
          fc.array(
            fc.record({
              id: fc.uuid(),
              content: fc.string({ minLength: 1, maxLength: 100 }),
              senderId: fc.uuid(),
              chatRoomId: fc.uuid(),
              sender: fc.record({
                id: fc.uuid(),
                username: fc.string({ minLength: 1, maxLength: 20 }),
                isOnline: fc.boolean()
              })
            }),
            { minLength: 0, maxLength: 5 }
          ), // mockMessages
          async (searchQuery: string, userId: string, mockMessages) => {
            const trimmedQuery = searchQuery.trim();
            const sanitizedQuery = ValidationUtils.sanitizeSearchQuery(trimmedQuery);
            
            // Skip if query becomes invalid after sanitization
            if (sanitizedQuery.length < 2) return;
            
            // Filter messages to only include those that actually contain the search term
            const relevantMessages = mockMessages.filter(msg => 
              msg.content.toLowerCase().includes(sanitizedQuery.toLowerCase())
            );

            // Setup mocks
            mockMessageRepository.searchMessages.mockResolvedValue(relevantMessages);

            // Execute
            const result = await messageService.searchMessages(
              { query: trimmedQuery },
              userId
            );

            // Verify: Message search accuracy property
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();

            if (result.data?.messages) {
              // Property: All returned messages should contain the search term
              result.data.messages.forEach((message: any) => {
                expect(message.content.toLowerCase()).toContain(sanitizedQuery.toLowerCase());
              });

              // Property: Number of returned messages should match relevant messages
              expect(result.data.messages.length).toBe(relevantMessages.length);
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should handle empty search results gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 2, maxLength: 20 })
            .filter(s => /^[a-zA-Z0-9\s]+$/.test(s))
            .filter(s => s.trim().length >= 2), // searchQuery
          fc.uuid(), // userId
          async (searchQuery: string, userId: string) => {
            const trimmedQuery = searchQuery.trim();
            const sanitizedQuery = ValidationUtils.sanitizeSearchQuery(trimmedQuery);
            
            // Skip if query becomes invalid after sanitization
            if (sanitizedQuery.length < 2) return;

            // Setup: No matching messages
            mockMessageRepository.searchMessages.mockResolvedValue([]);

            // Execute
            const result = await messageService.searchMessages(
              { query: trimmedQuery },
              userId
            );

            // Verify: Property that empty results are handled correctly
            expect(result.success).toBe(true);
            expect(result.data?.messages).toEqual([]);
            expect(result.data?.pagination.total).toBe(0);
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});