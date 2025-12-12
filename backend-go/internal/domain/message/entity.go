package message

import (
	"errors"
	"time"
)

var (
	ErrMessageNotFound = errors.New("message not found")
	ErrNotAuthorized   = errors.New("not authorized")
	ErrInvalidContent  = errors.New("invalid message content")
)

// Message represents a message entity
type Message struct {
	ID         string    `json:"id"`
	ChatRoomID string    `json:"chat_room_id"`
	SenderID   string    `json:"sender_id"`
	Content    string    `json:"content"`
	Type       string    `json:"type"`       // text, image, file
	Status     string    `json:"status"`     // sent, delivered, read
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// NewMessage creates a new message instance
func NewMessage(id, chatRoomID, senderID, content, messageType string) *Message {
	now := time.Now()
	return &Message{
		ID:         id,
		ChatRoomID: chatRoomID,
		SenderID:   senderID,
		Content:    content,
		Type:       messageType,
		Status:     "sent",
		CreatedAt:  now,
		UpdatedAt:  now,
	}
}

// UpdateStatus updates the message status
func (m *Message) UpdateStatus(status string) {
	m.Status = status
	m.UpdatedAt = time.Now()
}

// UpdateContent updates the message content
func (m *Message) UpdateContent(content string) {
	m.Content = content
	m.UpdatedAt = time.Now()
}

// IsEditable checks if the message can be edited
func (m *Message) IsEditable() bool {
	// Messages can be edited within 15 minutes of creation
	return time.Since(m.CreatedAt) <= 15*time.Minute
}

// IsDeletable checks if the message can be deleted
func (m *Message) IsDeletable() bool {
	// Messages can be deleted within 1 hour of creation
	return time.Since(m.CreatedAt) <= 1*time.Hour
}

// IsFromSender checks if the message is from the specified sender
func (m *Message) IsFromSender(senderID string) bool {
	return m.SenderID == senderID
}