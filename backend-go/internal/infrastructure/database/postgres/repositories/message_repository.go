package repositories

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"backend-go/internal/domain/message"
	"backend-go/internal/shared/logger"
)

type messageRepository struct {
	db     *pgxpool.Pool
	logger logger.Logger
}

func NewMessageRepository(db *pgxpool.Pool, logger logger.Logger) message.Repository {
	return &messageRepository{
		db:     db,
		logger: logger,
	}
}

func (r *messageRepository) Create(ctx context.Context, msg *message.Message) error {
	query := `
		INSERT INTO messages (id, chat_room_id, sender_id, content, type, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`

	_, err := r.db.Exec(ctx, query,
		msg.ID,
		msg.ChatRoomID,
		msg.SenderID,
		msg.Content,
		msg.Type,
		msg.Status,
		msg.CreatedAt,
		msg.UpdatedAt,
	)

	if err != nil {
		r.logger.Error("Failed to create message", "error", err, "message_id", msg.ID)
		return fmt.Errorf("failed to create message: %w", err)
	}

	r.logger.Info("Message created successfully", "message_id", msg.ID, "room_id", msg.ChatRoomID)
	return nil
}

func (r *messageRepository) GetByID(ctx context.Context, id string) (*message.Message, error) {
	query := `
		SELECT id, chat_room_id, sender_id, content, type, status, created_at, updated_at
		FROM messages
		WHERE id = $1
	`

	var msg message.Message
	err := r.db.QueryRow(ctx, query, id).Scan(
		&msg.ID,
		&msg.ChatRoomID,
		&msg.SenderID,
		&msg.Content,
		&msg.Type,
		&msg.Status,
		&msg.CreatedAt,
		&msg.UpdatedAt,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, message.ErrMessageNotFound
		}
		r.logger.Error("Failed to get message by ID", "error", err, "message_id", id)
		return nil, fmt.Errorf("failed to get message by ID: %w", err)
	}

	return &msg, nil
}

func (r *messageRepository) GetByChatRoom(ctx context.Context, chatRoomID string, limit, offset int) ([]*message.Message, int, error) {
	// Get total count
	countQuery := `SELECT COUNT(*) FROM messages WHERE chat_room_id = $1`
	var total int
	err := r.db.QueryRow(ctx, countQuery, chatRoomID).Scan(&total)
	if err != nil {
		r.logger.Error("Failed to get message count", "error", err, "room_id", chatRoomID)
		return nil, 0, fmt.Errorf("failed to get message count: %w", err)
	}

	// Get messages (ordered by created_at DESC for latest first)
	query := `
		SELECT id, chat_room_id, sender_id, content, type, status, created_at, updated_at
		FROM messages
		WHERE chat_room_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.Query(ctx, query, chatRoomID, limit, offset)
	if err != nil {
		r.logger.Error("Failed to get messages by chat room", "error", err, "room_id", chatRoomID)
		return nil, 0, fmt.Errorf("failed to get messages by chat room: %w", err)
	}
	defer rows.Close()

	var messages []*message.Message
	for rows.Next() {
		var msg message.Message
		err := rows.Scan(
			&msg.ID,
			&msg.ChatRoomID,
			&msg.SenderID,
			&msg.Content,
			&msg.Type,
			&msg.Status,
			&msg.CreatedAt,
			&msg.UpdatedAt,
		)

		if err != nil {
			r.logger.Error("Failed to scan message", "error", err, "room_id", chatRoomID)
			return nil, 0, fmt.Errorf("failed to scan message: %w", err)
		}

		messages = append(messages, &msg)
	}

	if err = rows.Err(); err != nil {
		r.logger.Error("Failed to iterate messages", "error", err, "room_id", chatRoomID)
		return nil, 0, fmt.Errorf("failed to iterate messages: %w", err)
	}

	return messages, total, nil
}

func (r *messageRepository) GetByChatRoomWithCursor(ctx context.Context, chatRoomID string, before string, limit int) ([]*message.Message, bool, error) {
	// Get the timestamp of the 'before' message
	var beforeTime time.Time
	if before != "" {
		beforeQuery := `SELECT created_at FROM messages WHERE id = $1`
		err := r.db.QueryRow(ctx, beforeQuery, before).Scan(&beforeTime)
		if err != nil {
			if err == pgx.ErrNoRows {
				return nil, false, fmt.Errorf("before message not found")
			}
			r.logger.Error("Failed to get before message timestamp", "error", err, "message_id", before)
			return nil, false, fmt.Errorf("failed to get before message timestamp: %w", err)
		}
	}

	// Build query with cursor
	var query string
	var args []interface{}

	if before != "" {
		query = `
			SELECT id, chat_room_id, sender_id, content, type, status, created_at, updated_at
			FROM messages
			WHERE chat_room_id = $1 AND created_at < $2
			ORDER BY created_at DESC
			LIMIT $3
		`
		args = []interface{}{chatRoomID, beforeTime, limit + 1} // +1 to check if there are more
	} else {
		query = `
			SELECT id, chat_room_id, sender_id, content, type, status, created_at, updated_at
			FROM messages
			WHERE chat_room_id = $1
			ORDER BY created_at DESC
			LIMIT $2
		`
		args = []interface{}{chatRoomID, limit + 1} // +1 to check if there are more
	}

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		r.logger.Error("Failed to get messages with cursor", "error", err, "room_id", chatRoomID)
		return nil, false, fmt.Errorf("failed to get messages with cursor: %w", err)
	}
	defer rows.Close()

	var messages []*message.Message
	for rows.Next() {
		var msg message.Message
		err := rows.Scan(
			&msg.ID,
			&msg.ChatRoomID,
			&msg.SenderID,
			&msg.Content,
			&msg.Type,
			&msg.Status,
			&msg.CreatedAt,
			&msg.UpdatedAt,
		)

		if err != nil {
			r.logger.Error("Failed to scan message", "error", err, "room_id", chatRoomID)
			return nil, false, fmt.Errorf("failed to scan message: %w", err)
		}

		messages = append(messages, &msg)
	}

	if err = rows.Err(); err != nil {
		r.logger.Error("Failed to iterate messages", "error", err, "room_id", chatRoomID)
		return nil, false, fmt.Errorf("failed to iterate messages: %w", err)
	}

	// Check if there are more messages
	hasMore := len(messages) > limit
	if hasMore {
		messages = messages[:limit] // Remove the extra message
	}

	return messages, hasMore, nil
}

func (r *messageRepository) Update(ctx context.Context, msg *message.Message) error {
	query := `
		UPDATE messages
		SET content = $2, type = $3, status = $4, updated_at = $5
		WHERE id = $1
	`

	msg.UpdatedAt = time.Now()

	result, err := r.db.Exec(ctx, query,
		msg.ID,
		msg.Content,
		msg.Type,
		msg.Status,
		msg.UpdatedAt,
	)

	if err != nil {
		r.logger.Error("Failed to update message", "error", err, "message_id", msg.ID)
		return fmt.Errorf("failed to update message: %w", err)
	}

	if result.RowsAffected() == 0 {
		return message.ErrMessageNotFound
	}

	r.logger.Info("Message updated successfully", "message_id", msg.ID)
	return nil
}

func (r *messageRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM messages WHERE id = $1`

	result, err := r.db.Exec(ctx, query, id)
	if err != nil {
		r.logger.Error("Failed to delete message", "error", err, "message_id", id)
		return fmt.Errorf("failed to delete message: %w", err)
	}

	if result.RowsAffected() == 0 {
		return message.ErrMessageNotFound
	}

	r.logger.Info("Message deleted successfully", "message_id", id)
	return nil
}

func (r *messageRepository) UpdateStatus(ctx context.Context, messageID, status string) error {
	query := `
		UPDATE messages
		SET status = $2, updated_at = $3
		WHERE id = $1
	`

	result, err := r.db.Exec(ctx, query, messageID, status, time.Now())
	if err != nil {
		r.logger.Error("Failed to update message status", "error", err, "message_id", messageID)
		return fmt.Errorf("failed to update message status: %w", err)
	}

	if result.RowsAffected() == 0 {
		return message.ErrMessageNotFound
	}

	r.logger.Info("Message status updated successfully", "message_id", messageID, "status", status)
	return nil
}

func (r *messageRepository) GetUnreadCount(ctx context.Context, chatRoomID, userID string) (int, error) {
	// This is a simplified implementation
	// In a real system, you'd need a separate table to track read status per user
	query := `
		SELECT COUNT(*)
		FROM messages
		WHERE chat_room_id = $1 AND sender_id != $2 AND status != 'read'
	`

	var count int
	err := r.db.QueryRow(ctx, query, chatRoomID, userID).Scan(&count)
	if err != nil {
		r.logger.Error("Failed to get unread count", "error", err, "room_id", chatRoomID, "user_id", userID)
		return 0, fmt.Errorf("failed to get unread count: %w", err)
	}

	return count, nil
}

func (r *messageRepository) MarkAsRead(ctx context.Context, chatRoomID, userID string) error {
	// This is a simplified implementation
	// In a real system, you'd need a separate table to track read status per user
	query := `
		UPDATE messages
		SET status = 'read', updated_at = $3
		WHERE chat_room_id = $1 AND sender_id != $2 AND status != 'read'
	`

	_, err := r.db.Exec(ctx, query, chatRoomID, userID, time.Now())
	if err != nil {
		r.logger.Error("Failed to mark messages as read", "error", err, "room_id", chatRoomID, "user_id", userID)
		return fmt.Errorf("failed to mark messages as read: %w", err)
	}

	r.logger.Info("Messages marked as read", "room_id", chatRoomID, "user_id", userID)
	return nil
}