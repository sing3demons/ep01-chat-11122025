package message

import "context"

// Repository defines the interface for message data access
type Repository interface {
	Create(ctx context.Context, message *Message) error
	GetByID(ctx context.Context, id string) (*Message, error)
	GetByChatRoom(ctx context.Context, chatRoomID string, limit, offset int) ([]*Message, int, error)
	GetByChatRoomWithCursor(ctx context.Context, chatRoomID string, before string, limit int) ([]*Message, bool, error)
	Update(ctx context.Context, message *Message) error
	Delete(ctx context.Context, id string) error
	UpdateStatus(ctx context.Context, messageID, status string) error
	GetUnreadCount(ctx context.Context, chatRoomID, userID string) (int, error)
	MarkAsRead(ctx context.Context, chatRoomID, userID string) error
}