package chat

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"backend-go/internal/domain/chat"
	"backend-go/internal/domain/user"
	"backend-go/internal/shared/logger"
	"backend-go/internal/shared/validation"
)

type useCase struct {
	chatRepo  chat.Repository
	userRepo  user.Repository
	validator validation.Validator
	logger    logger.Logger
}

// NewUseCase creates a new chat use case
func NewUseCase(
	chatRepo chat.Repository,
	userRepo user.Repository,
	validator validation.Validator,
	logger logger.Logger,
) UseCase {
	return &useCase{
		chatRepo:  chatRepo,
		userRepo:  userRepo,
		validator: validator,
		logger:    logger,
	}
}

func (uc *useCase) CreateChatRoom(ctx context.Context, input CreateChatRoomInput) (*CreateChatRoomOutput, error) {
	// Validate input
	if err := uc.validator.Struct(input); err != nil {
		uc.logger.Error("Invalid create chat room input", "error", err)
		return nil, fmt.Errorf("invalid input: %w", err)
	}

	// Check if creator exists
	creator, err := uc.userRepo.GetByID(ctx, input.CreatedBy)
	if err != nil {
		if err == user.ErrUserNotFound {
			return nil, fmt.Errorf("creator not found")
		}
		uc.logger.Error("Failed to get creator", "error", err, "user_id", input.CreatedBy)
		return nil, fmt.Errorf("failed to verify creator: %w", err)
	}

	if !creator.IsActive {
		return nil, fmt.Errorf("creator account is inactive")
	}

	// Create chat room
	roomID := uuid.New().String()
	chatRoom := chat.NewChatRoom(roomID, input.Name, input.Description, input.CreatedBy, input.IsPrivate)

	// Add additional members if provided
	for _, memberID := range input.Members {
		if memberID != input.CreatedBy { // Creator is already added
			// Verify member exists
			member, err := uc.userRepo.GetByID(ctx, memberID)
			if err != nil {
				uc.logger.Warn("Member not found, skipping", "member_id", memberID)
				continue
			}
			if !member.IsActive {
				uc.logger.Warn("Member account inactive, skipping", "member_id", memberID)
				continue
			}
			chatRoom.AddMember(memberID)
		}
	}

	// Save to repository
	if err := uc.chatRepo.Create(ctx, chatRoom); err != nil {
		uc.logger.Error("Failed to create chat room", "error", err, "room_id", roomID)
		return nil, fmt.Errorf("failed to create chat room: %w", err)
	}

	uc.logger.Info("Chat room created successfully", "room_id", roomID, "created_by", input.CreatedBy)

	return &CreateChatRoomOutput{
		ID:          chatRoom.ID,
		Name:        chatRoom.Name,
		Description: chatRoom.Description,
		IsPrivate:   chatRoom.IsPrivate,
		CreatedBy:   chatRoom.CreatedBy,
		Members:     chatRoom.Members,
		CreatedAt:   chatRoom.CreatedAt,
		UpdatedAt:   chatRoom.UpdatedAt,
	}, nil
}

func (uc *useCase) GetChatRoom(ctx context.Context, input GetChatRoomInput) (*GetChatRoomOutput, error) {
	// Validate input
	if err := uc.validator.Struct(input); err != nil {
		uc.logger.Error("Invalid get chat room input", "error", err)
		return nil, fmt.Errorf("invalid input: %w", err)
	}

	// Get chat room
	chatRoom, err := uc.chatRepo.GetByID(ctx, input.RoomID)
	if err != nil {
		if err == chat.ErrChatRoomNotFound {
			return nil, fmt.Errorf("chat room not found")
		}
		uc.logger.Error("Failed to get chat room", "error", err, "room_id", input.RoomID)
		return nil, fmt.Errorf("failed to get chat room: %w", err)
	}

	// Check if user is a member
	if !chatRoom.IsMember(input.UserID) {
		return nil, fmt.Errorf("access denied: not a member of this chat room")
	}

	return &GetChatRoomOutput{
		ID:          chatRoom.ID,
		Name:        chatRoom.Name,
		Description: chatRoom.Description,
		IsPrivate:   chatRoom.IsPrivate,
		CreatedBy:   chatRoom.CreatedBy,
		Members:     chatRoom.Members,
		CreatedAt:   chatRoom.CreatedAt,
		UpdatedAt:   chatRoom.UpdatedAt,
	}, nil
}

func (uc *useCase) GetUserChatRooms(ctx context.Context, input GetUserChatRoomsInput) (*GetUserChatRoomsOutput, error) {
	// Validate input
	if err := uc.validator.Struct(input); err != nil {
		uc.logger.Error("Invalid get user chat rooms input", "error", err)
		return nil, fmt.Errorf("invalid input: %w", err)
	}

	// Calculate offset
	offset := (input.Page - 1) * input.Limit

	// Get user's chat rooms
	chatRooms, total, err := uc.chatRepo.GetUserChatRooms(ctx, input.UserID, input.Limit, offset)
	if err != nil {
		uc.logger.Error("Failed to get user chat rooms", "error", err, "user_id", input.UserID)
		return nil, fmt.Errorf("failed to get user chat rooms: %w", err)
	}

	// Convert to output format
	var result []*GetChatRoomOutput
	for _, room := range chatRooms {
		result = append(result, &GetChatRoomOutput{
			ID:          room.ID,
			Name:        room.Name,
			Description: room.Description,
			IsPrivate:   room.IsPrivate,
			CreatedBy:   room.CreatedBy,
			Members:     room.Members,
			CreatedAt:   room.CreatedAt,
			UpdatedAt:   room.UpdatedAt,
		})
	}

	return &GetUserChatRoomsOutput{
		ChatRooms: result,
		Total:     total,
	}, nil
}

func (uc *useCase) JoinChatRoom(ctx context.Context, input JoinChatRoomInput) error {
	// Validate input
	if err := uc.validator.Struct(input); err != nil {
		uc.logger.Error("Invalid join chat room input", "error", err)
		return fmt.Errorf("invalid input: %w", err)
	}

	// Get chat room
	chatRoom, err := uc.chatRepo.GetByID(ctx, input.RoomID)
	if err != nil {
		if err == chat.ErrChatRoomNotFound {
			return fmt.Errorf("chat room not found")
		}
		uc.logger.Error("Failed to get chat room", "error", err, "room_id", input.RoomID)
		return fmt.Errorf("failed to get chat room: %w", err)
	}

	// Check if user can join
	if !chatRoom.CanJoin(input.UserID) {
		return fmt.Errorf("cannot join this chat room")
	}

	// Check if user is already a member
	if chatRoom.IsMember(input.UserID) {
		return fmt.Errorf("already a member of this chat room")
	}

	// Verify user exists and is active
	u, err := uc.userRepo.GetByID(ctx, input.UserID)
	if err != nil {
		if err == user.ErrUserNotFound {
			return fmt.Errorf("user not found")
		}
		uc.logger.Error("Failed to get user", "error", err, "user_id", input.UserID)
		return fmt.Errorf("failed to verify user: %w", err)
	}

	if !u.IsActive {
		return fmt.Errorf("user account is inactive")
	}

	// Add member to chat room
	if err := uc.chatRepo.AddMember(ctx, input.RoomID, input.UserID); err != nil {
		uc.logger.Error("Failed to add member to chat room", "error", err, "room_id", input.RoomID, "user_id", input.UserID)
		return fmt.Errorf("failed to join chat room: %w", err)
	}

	uc.logger.Info("User joined chat room successfully", "room_id", input.RoomID, "user_id", input.UserID)
	return nil
}

func (uc *useCase) LeaveChatRoom(ctx context.Context, input LeaveChatRoomInput) error {
	// Validate input
	if err := uc.validator.Struct(input); err != nil {
		uc.logger.Error("Invalid leave chat room input", "error", err)
		return fmt.Errorf("invalid input: %w", err)
	}

	// Get chat room
	chatRoom, err := uc.chatRepo.GetByID(ctx, input.RoomID)
	if err != nil {
		if err == chat.ErrChatRoomNotFound {
			return fmt.Errorf("chat room not found")
		}
		uc.logger.Error("Failed to get chat room", "error", err, "room_id", input.RoomID)
		return fmt.Errorf("failed to get chat room: %w", err)
	}

	// Check if user is a member
	if !chatRoom.IsMember(input.UserID) {
		return fmt.Errorf("not a member of this chat room")
	}

	// Don't allow creator to leave if there are other members
	if chatRoom.IsCreator(input.UserID) && chatRoom.MemberCount() > 1 {
		return fmt.Errorf("creator cannot leave chat room with other members")
	}

	// Remove member from chat room
	if err := uc.chatRepo.RemoveMember(ctx, input.RoomID, input.UserID); err != nil {
		uc.logger.Error("Failed to remove member from chat room", "error", err, "room_id", input.RoomID, "user_id", input.UserID)
		return fmt.Errorf("failed to leave chat room: %w", err)
	}

	// If creator left and was the last member, delete the chat room
	if chatRoom.IsCreator(input.UserID) && chatRoom.MemberCount() == 1 {
		if err := uc.chatRepo.Delete(ctx, input.RoomID); err != nil {
			uc.logger.Error("Failed to delete empty chat room", "error", err, "room_id", input.RoomID)
			// Don't return error, user has already left
		}
	}

	uc.logger.Info("User left chat room successfully", "room_id", input.RoomID, "user_id", input.UserID)
	return nil
}

func (uc *useCase) UpdateChatRoom(ctx context.Context, input UpdateChatRoomInput) (*UpdateChatRoomOutput, error) {
	// Validate input
	if err := uc.validator.Struct(input); err != nil {
		uc.logger.Error("Invalid update chat room input", "error", err)
		return nil, fmt.Errorf("invalid input: %w", err)
	}

	// Get chat room
	chatRoom, err := uc.chatRepo.GetByID(ctx, input.RoomID)
	if err != nil {
		if err == chat.ErrChatRoomNotFound {
			return nil, fmt.Errorf("chat room not found")
		}
		uc.logger.Error("Failed to get chat room", "error", err, "room_id", input.RoomID)
		return nil, fmt.Errorf("failed to get chat room: %w", err)
	}

	// Check if user is the creator (only creator can update)
	if !chatRoom.IsCreator(input.UserID) {
		return nil, fmt.Errorf("only creator can update chat room")
	}

	// Update chat room
	name := input.Name
	if name == "" {
		name = chatRoom.Name
	}

	description := input.Description
	if description == "" {
		description = chatRoom.Description
	}

	isPrivate := chatRoom.IsPrivate
	if input.IsPrivate != nil {
		isPrivate = *input.IsPrivate
	}

	chatRoom.Update(name, description, isPrivate)

	// Save changes
	if err := uc.chatRepo.Update(ctx, chatRoom); err != nil {
		uc.logger.Error("Failed to update chat room", "error", err, "room_id", input.RoomID)
		return nil, fmt.Errorf("failed to update chat room: %w", err)
	}

	uc.logger.Info("Chat room updated successfully", "room_id", input.RoomID, "user_id", input.UserID)

	return &UpdateChatRoomOutput{
		ID:          chatRoom.ID,
		Name:        chatRoom.Name,
		Description: chatRoom.Description,
		IsPrivate:   chatRoom.IsPrivate,
		CreatedBy:   chatRoom.CreatedBy,
		Members:     chatRoom.Members,
		CreatedAt:   chatRoom.CreatedAt,
		UpdatedAt:   chatRoom.UpdatedAt,
	}, nil
}

func (uc *useCase) DeleteChatRoom(ctx context.Context, input DeleteChatRoomInput) error {
	// Validate input
	if err := uc.validator.Struct(input); err != nil {
		uc.logger.Error("Invalid delete chat room input", "error", err)
		return fmt.Errorf("invalid input: %w", err)
	}

	// Get chat room
	chatRoom, err := uc.chatRepo.GetByID(ctx, input.RoomID)
	if err != nil {
		if err == chat.ErrChatRoomNotFound {
			return fmt.Errorf("chat room not found")
		}
		uc.logger.Error("Failed to get chat room", "error", err, "room_id", input.RoomID)
		return fmt.Errorf("failed to get chat room: %w", err)
	}

	// Check if user is the creator (only creator can delete)
	if !chatRoom.IsCreator(input.UserID) {
		return fmt.Errorf("only creator can delete chat room")
	}

	// Delete chat room
	if err := uc.chatRepo.Delete(ctx, input.RoomID); err != nil {
		uc.logger.Error("Failed to delete chat room", "error", err, "room_id", input.RoomID)
		return fmt.Errorf("failed to delete chat room: %w", err)
	}

	uc.logger.Info("Chat room deleted successfully", "room_id", input.RoomID, "user_id", input.UserID)
	return nil
}