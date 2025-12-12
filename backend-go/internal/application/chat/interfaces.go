package chat

import (
	"context"
	"time"
)

// UseCase defines the interface for chat use cases
type UseCase interface {
	CreateChatRoom(ctx context.Context, input CreateChatRoomInput) (*CreateChatRoomOutput, error)
	GetChatRoom(ctx context.Context, input GetChatRoomInput) (*GetChatRoomOutput, error)
	GetUserChatRooms(ctx context.Context, input GetUserChatRoomsInput) (*GetUserChatRoomsOutput, error)
	JoinChatRoom(ctx context.Context, input JoinChatRoomInput) error
	LeaveChatRoom(ctx context.Context, input LeaveChatRoomInput) error
	UpdateChatRoom(ctx context.Context, input UpdateChatRoomInput) (*UpdateChatRoomOutput, error)
	DeleteChatRoom(ctx context.Context, input DeleteChatRoomInput) error
}

// CreateChatRoomInput represents the input for creating a chat room
type CreateChatRoomInput struct {
	Name        string   `json:"name" validate:"required,min=1,max=100"`
	Description string   `json:"description,omitempty" validate:"max=500"`
	IsPrivate   bool     `json:"is_private"`
	CreatedBy   string   `json:"created_by" validate:"required"`
	Members     []string `json:"members,omitempty"`
}

// CreateChatRoomOutput represents the output for creating a chat room
type CreateChatRoomOutput struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description,omitempty"`
	IsPrivate   bool      `json:"is_private"`
	CreatedBy   string    `json:"created_by"`
	Members     []string  `json:"members"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// GetChatRoomInput represents the input for getting a chat room
type GetChatRoomInput struct {
	RoomID string `json:"room_id" validate:"required"`
	UserID string `json:"user_id" validate:"required"`
}

// GetChatRoomOutput represents the output for getting a chat room
type GetChatRoomOutput struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description,omitempty"`
	IsPrivate   bool      `json:"is_private"`
	CreatedBy   string    `json:"created_by"`
	Members     []string  `json:"members"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// GetUserChatRoomsInput represents the input for getting user's chat rooms
type GetUserChatRoomsInput struct {
	UserID string `json:"user_id" validate:"required"`
	Page   int    `json:"page" validate:"min=1"`
	Limit  int    `json:"limit" validate:"min=1,max=100"`
}

// GetUserChatRoomsOutput represents the output for getting user's chat rooms
type GetUserChatRoomsOutput struct {
	ChatRooms []*GetChatRoomOutput `json:"chat_rooms"`
	Total     int                  `json:"total"`
}

// JoinChatRoomInput represents the input for joining a chat room
type JoinChatRoomInput struct {
	RoomID string `json:"room_id" validate:"required"`
	UserID string `json:"user_id" validate:"required"`
}

// LeaveChatRoomInput represents the input for leaving a chat room
type LeaveChatRoomInput struct {
	RoomID string `json:"room_id" validate:"required"`
	UserID string `json:"user_id" validate:"required"`
}

// UpdateChatRoomInput represents the input for updating a chat room
type UpdateChatRoomInput struct {
	RoomID      string `json:"room_id" validate:"required"`
	UserID      string `json:"user_id" validate:"required"`
	Name        string `json:"name,omitempty" validate:"omitempty,min=1,max=100"`
	Description string `json:"description,omitempty" validate:"max=500"`
	IsPrivate   *bool  `json:"is_private,omitempty"`
}

// UpdateChatRoomOutput represents the output for updating a chat room
type UpdateChatRoomOutput struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description,omitempty"`
	IsPrivate   bool      `json:"is_private"`
	CreatedBy   string    `json:"created_by"`
	Members     []string  `json:"members"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// DeleteChatRoomInput represents the input for deleting a chat room
type DeleteChatRoomInput struct {
	RoomID string `json:"room_id" validate:"required"`
	UserID string `json:"user_id" validate:"required"`
}