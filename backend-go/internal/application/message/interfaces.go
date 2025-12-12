package message

import (
	"context"
	"time"
)

// UseCase defines the interface for message use cases
type UseCase interface {
	SendMessage(ctx context.Context, input SendMessageInput) (*SendMessageOutput, error)
	GetMessage(ctx context.Context, input GetMessageInput) (*GetMessageOutput, error)
	GetMessages(ctx context.Context, input GetMessagesInput) (*GetMessagesOutput, error)
	UpdateMessageStatus(ctx context.Context, input UpdateMessageStatusInput) error
	DeleteMessage(ctx context.Context, input DeleteMessageInput) error
}

// SendMessageInput represents the input for sending a message
type SendMessageInput struct {
	ChatRoomID string `json:"chat_room_id" validate:"required"`
	SenderID   string `json:"sender_id" validate:"required"`
	Content    string `json:"content" validate:"required,min=1"`
	Type       string `json:"type" validate:"required,oneof=text image file"`
}

// SendMessageOutput represents the output for sending a message
type SendMessageOutput struct {
	ID         string    `json:"id"`
	ChatRoomID string    `json:"chat_room_id"`
	SenderID   string    `json:"sender_id"`
	Content    string    `json:"content"`
	Type       string    `json:"type"`
	Status     string    `json:"status"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// GetMessageInput represents the input for getting a message
type GetMessageInput struct {
	MessageID string `json:"message_id" validate:"required"`
	UserID    string `json:"user_id" validate:"required"`
}

// GetMessageOutput represents the output for getting a message
type GetMessageOutput struct {
	ID         string    `json:"id"`
	ChatRoomID string    `json:"chat_room_id"`
	SenderID   string    `json:"sender_id"`
	Content    string    `json:"content"`
	Type       string    `json:"type"`
	Status     string    `json:"status"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// GetMessagesInput represents the input for getting messages
type GetMessagesInput struct {
	ChatRoomID string `json:"chat_room_id" validate:"required"`
	UserID     string `json:"user_id" validate:"required"`
	Page       int    `json:"page" validate:"min=1"`
	Limit      int    `json:"limit" validate:"min=1,max=100"`
	Before     string `json:"before,omitempty"` // For cursor-based pagination
}

// GetMessagesOutput represents the output for getting messages
type GetMessagesOutput struct {
	Messages []*GetMessageOutput `json:"messages"`
	Total    int                 `json:"total"`
	HasMore  bool                `json:"has_more"`
}

// UpdateMessageStatusInput represents the input for updating message status
type UpdateMessageStatusInput struct {
	MessageID string `json:"message_id" validate:"required"`
	UserID    string `json:"user_id" validate:"required"`
	Status    string `json:"status" validate:"required,oneof=delivered read"`
}

// DeleteMessageInput represents the input for deleting a message
type DeleteMessageInput struct {
	MessageID string `json:"message_id" validate:"required"`
	UserID    string `json:"user_id" validate:"required"`
}