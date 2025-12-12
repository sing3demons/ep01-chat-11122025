package chat

import (
	"errors"
	"time"
)

var (
	ErrChatRoomNotFound = errors.New("chat room not found")
	ErrMemberNotFound   = errors.New("member not found")
	ErrNotAuthorized    = errors.New("not authorized")
	ErrAlreadyMember    = errors.New("already a member")
)

// ChatRoom represents a chat room entity
type ChatRoom struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description,omitempty"`
	IsPrivate   bool      `json:"is_private"`
	CreatedBy   string    `json:"created_by"`
	Members     []string  `json:"members"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// NewChatRoom creates a new chat room instance
func NewChatRoom(id, name, description, createdBy string, isPrivate bool) *ChatRoom {
	now := time.Now()
	return &ChatRoom{
		ID:          id,
		Name:        name,
		Description: description,
		IsPrivate:   isPrivate,
		CreatedBy:   createdBy,
		Members:     []string{createdBy}, // Creator is automatically a member
		CreatedAt:   now,
		UpdatedAt:   now,
	}
}

// AddMember adds a user to the chat room
func (c *ChatRoom) AddMember(userID string) error {
	// Check if user is already a member
	for _, member := range c.Members {
		if member == userID {
			return ErrAlreadyMember
		}
	}

	c.Members = append(c.Members, userID)
	c.UpdatedAt = time.Now()
	return nil
}

// RemoveMember removes a user from the chat room
func (c *ChatRoom) RemoveMember(userID string) error {
	for i, member := range c.Members {
		if member == userID {
			// Remove member from slice
			c.Members = append(c.Members[:i], c.Members[i+1:]...)
			c.UpdatedAt = time.Now()
			return nil
		}
	}
	return ErrMemberNotFound
}

// IsMember checks if a user is a member of the chat room
func (c *ChatRoom) IsMember(userID string) bool {
	for _, member := range c.Members {
		if member == userID {
			return true
		}
	}
	return false
}

// IsCreator checks if a user is the creator of the chat room
func (c *ChatRoom) IsCreator(userID string) bool {
	return c.CreatedBy == userID
}

// CanJoin checks if a user can join the chat room
func (c *ChatRoom) CanJoin(userID string) bool {
	// If it's a private room, only invited members can join
	if c.IsPrivate {
		return c.IsMember(userID)
	}
	// Public rooms can be joined by anyone
	return true
}

// Update updates the chat room information
func (c *ChatRoom) Update(name, description string, isPrivate bool) {
	if name != "" {
		c.Name = name
	}
	if description != "" {
		c.Description = description
	}
	c.IsPrivate = isPrivate
	c.UpdatedAt = time.Now()
}

// MemberCount returns the number of members in the chat room
func (c *ChatRoom) MemberCount() int {
	return len(c.Members)
}