package message

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"backend-go/internal/domain/chat"
	"backend-go/internal/domain/message"
	"backend-go/internal/shared/logger"
	"backend-go/internal/shared/validation"
)

type useCase struct {
	messageRepo message.Repository
	chatRepo    chat.Repository
	validator   validation.Validator
	logger      logger.Logger
}

// NewUseCase creates a new message use case
func NewUseCase(
	messageRepo message.Repository,
	chatRepo chat.Repository,
	validator validation.Validator,
	logger logger.Logger,
) UseCase {
	return &useCase{
		messageRepo: messageRepo,
		chatRepo:    chatRepo,
		validator:   validator,
		logger:      logger,
	}
}

func (uc *useCase) SendMessage(ctx context.Context, input SendMessageInput) (*SendMessageOutput, error) {
	// Validate input
	if err := uc.validator.Struct(input); err != nil {
		uc.logger.Error("Invalid send message input", "error", err)
		return nil, fmt.Errorf("invalid input: %w", err)
	}

	// Check if chat room exists and user is a member
	chatRoom, err := uc.chatRepo.GetByID(ctx, input.ChatRoomID)
	if err != nil {
		if err == chat.ErrChatRoomNotFound {
			return nil, fmt.Errorf("chat room not found")
		}
		uc.logger.Error("Failed to get chat room", "error", err, "room_id", input.ChatRoomID)
		return nil, fmt.Errorf("failed to verify chat room: %w", err)
	}

	if !chatRoom.IsMember(input.SenderID) {
		return nil, fmt.Errorf("not a member of this chat room")
	}

	// Create message
	messageID := uuid.New().String()
	msg := message.NewMessage(messageID, input.ChatRoomID, input.SenderID, input.Content, input.Type)

	// Save message
	if err := uc.messageRepo.Create(ctx, msg); err != nil {
		uc.logger.Error("Failed to create message", "error", err, "message_id", messageID)
		return nil, fmt.Errorf("failed to send message: %w", err)
	}

	uc.logger.Info("Message sent successfully", "message_id", messageID, "room_id", input.ChatRoomID, "sender_id", input.SenderID)

	return &SendMessageOutput{
		ID:         msg.ID,
		ChatRoomID: msg.ChatRoomID,
		SenderID:   msg.SenderID,
		Content:    msg.Content,
		Type:       msg.Type,
		Status:     msg.Status,
		CreatedAt:  msg.CreatedAt,
		UpdatedAt:  msg.UpdatedAt,
	}, nil
}

func (uc *useCase) GetMessage(ctx context.Context, input GetMessageInput) (*GetMessageOutput, error) {
	// Validate input
	if err := uc.validator.Struct(input); err != nil {
		uc.logger.Error("Invalid get message input", "error", err)
		return nil, fmt.Errorf("invalid input: %w", err)
	}

	// Get message
	msg, err := uc.messageRepo.GetByID(ctx, input.MessageID)
	if err != nil {
		if err == message.ErrMessageNotFound {
			return nil, fmt.Errorf("message not found")
		}
		uc.logger.Error("Failed to get message", "error", err, "message_id", input.MessageID)
		return nil, fmt.Errorf("failed to get message: %w", err)
	}

	// Check if user is a member of the chat room
	chatRoom, err := uc.chatRepo.GetByID(ctx, msg.ChatRoomID)
	if err != nil {
		uc.logger.Error("Failed to get chat room", "error", err, "room_id", msg.ChatRoomID)
		return nil, fmt.Errorf("failed to verify access: %w", err)
	}

	if !chatRoom.IsMember(input.UserID) {
		return nil, fmt.Errorf("access denied: not a member of this chat room")
	}

	return &GetMessageOutput{
		ID:         msg.ID,
		ChatRoomID: msg.ChatRoomID,
		SenderID:   msg.SenderID,
		Content:    msg.Content,
		Type:       msg.Type,
		Status:     msg.Status,
		CreatedAt:  msg.CreatedAt,
		UpdatedAt:  msg.UpdatedAt,
	}, nil
}

func (uc *useCase) GetMessages(ctx context.Context, input GetMessagesInput) (*GetMessagesOutput, error) {
	// Validate input
	if err := uc.validator.Struct(input); err != nil {
		uc.logger.Error("Invalid get messages input", "error", err)
		return nil, fmt.Errorf("invalid input: %w", err)
	}

	// Check if user is a member of the chat room
	chatRoom, err := uc.chatRepo.GetByID(ctx, input.ChatRoomID)
	if err != nil {
		if err == chat.ErrChatRoomNotFound {
			return nil, fmt.Errorf("chat room not found")
		}
		uc.logger.Error("Failed to get chat room", "error", err, "room_id", input.ChatRoomID)
		return nil, fmt.Errorf("failed to verify access: %w", err)
	}

	if !chatRoom.IsMember(input.UserID) {
		return nil, fmt.Errorf("access denied: not a member of this chat room")
	}

	var messages []*message.Message
	var total int
	var hasMore bool

	// Use cursor-based pagination if 'before' is provided
	if input.Before != "" {
		msgs, more, err := uc.messageRepo.GetByChatRoomWithCursor(ctx, input.ChatRoomID, input.Before, input.Limit)
		if err != nil {
			uc.logger.Error("Failed to get messages with cursor", "error", err, "room_id", input.ChatRoomID)
			return nil, fmt.Errorf("failed to get messages: %w", err)
		}
		messages = msgs
		hasMore = more
		total = len(msgs) // For cursor-based pagination, we don't have total count
	} else {
		// Use offset-based pagination
		offset := (input.Page - 1) * input.Limit
		msgs, totalCount, err := uc.messageRepo.GetByChatRoom(ctx, input.ChatRoomID, input.Limit, offset)
		if err != nil {
			uc.logger.Error("Failed to get messages", "error", err, "room_id", input.ChatRoomID)
			return nil, fmt.Errorf("failed to get messages: %w", err)
		}
		messages = msgs
		total = totalCount
		hasMore = offset+len(msgs) < totalCount
	}

	// Convert to output format
	var result []*GetMessageOutput
	for _, msg := range messages {
		result = append(result, &GetMessageOutput{
			ID:         msg.ID,
			ChatRoomID: msg.ChatRoomID,
			SenderID:   msg.SenderID,
			Content:    msg.Content,
			Type:       msg.Type,
			Status:     msg.Status,
			CreatedAt:  msg.CreatedAt,
			UpdatedAt:  msg.UpdatedAt,
		})
	}

	return &GetMessagesOutput{
		Messages: result,
		Total:    total,
		HasMore:  hasMore,
	}, nil
}

func (uc *useCase) UpdateMessageStatus(ctx context.Context, input UpdateMessageStatusInput) error {
	// Validate input
	if err := uc.validator.Struct(input); err != nil {
		uc.logger.Error("Invalid update message status input", "error", err)
		return fmt.Errorf("invalid input: %w", err)
	}

	// Get message
	msg, err := uc.messageRepo.GetByID(ctx, input.MessageID)
	if err != nil {
		if err == message.ErrMessageNotFound {
			return fmt.Errorf("message not found")
		}
		uc.logger.Error("Failed to get message", "error", err, "message_id", input.MessageID)
		return fmt.Errorf("failed to get message: %w", err)
	}

	// Check if user is a member of the chat room
	chatRoom, err := uc.chatRepo.GetByID(ctx, msg.ChatRoomID)
	if err != nil {
		uc.logger.Error("Failed to get chat room", "error", err, "room_id", msg.ChatRoomID)
		return fmt.Errorf("failed to verify access: %w", err)
	}

	if !chatRoom.IsMember(input.UserID) {
		return fmt.Errorf("access denied: not a member of this chat room")
	}

	// Only allow updating to 'delivered' or 'read' status
	// And only if the user is not the sender (can't mark own messages as read)
	if msg.SenderID == input.UserID {
		return fmt.Errorf("cannot update status of own message")
	}

	// Update message status
	if err := uc.messageRepo.UpdateStatus(ctx, input.MessageID, input.Status); err != nil {
		uc.logger.Error("Failed to update message status", "error", err, "message_id", input.MessageID)
		return fmt.Errorf("failed to update message status: %w", err)
	}

	uc.logger.Info("Message status updated successfully", "message_id", input.MessageID, "status", input.Status, "user_id", input.UserID)
	return nil
}

func (uc *useCase) DeleteMessage(ctx context.Context, input DeleteMessageInput) error {
	// Validate input
	if err := uc.validator.Struct(input); err != nil {
		uc.logger.Error("Invalid delete message input", "error", err)
		return fmt.Errorf("invalid input: %w", err)
	}

	// Get message
	msg, err := uc.messageRepo.GetByID(ctx, input.MessageID)
	if err != nil {
		if err == message.ErrMessageNotFound {
			return fmt.Errorf("message not found")
		}
		uc.logger.Error("Failed to get message", "error", err, "message_id", input.MessageID)
		return fmt.Errorf("failed to get message: %w", err)
	}

	// Check if user is the sender
	if !msg.IsFromSender(input.UserID) {
		return fmt.Errorf("can only delete own messages")
	}

	// Check if message is deletable (within time limit)
	if !msg.IsDeletable() {
		return fmt.Errorf("message can no longer be deleted")
	}

	// Delete message
	if err := uc.messageRepo.Delete(ctx, input.MessageID); err != nil {
		uc.logger.Error("Failed to delete message", "error", err, "message_id", input.MessageID)
		return fmt.Errorf("failed to delete message: %w", err)
	}

	uc.logger.Info("Message deleted successfully", "message_id", input.MessageID, "user_id", input.UserID)
	return nil
}