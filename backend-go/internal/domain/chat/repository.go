package chat

import "context"

// Repository defines the interface for chat room data access
type Repository interface {
	Create(ctx context.Context, chatRoom *ChatRoom) error
	GetByID(ctx context.Context, id string) (*ChatRoom, error)
	GetUserChatRooms(ctx context.Context, userID string, limit, offset int) ([]*ChatRoom, int, error)
	Update(ctx context.Context, chatRoom *ChatRoom) error
	Delete(ctx context.Context, id string) error
	AddMember(ctx context.Context, roomID, userID string) error
	RemoveMember(ctx context.Context, roomID, userID string) error
	IsMember(ctx context.Context, roomID, userID string) (bool, error)
}