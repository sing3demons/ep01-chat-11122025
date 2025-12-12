package repositories

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"backend-go/internal/domain/chat"
	"backend-go/internal/shared/logger"
)

type chatRepository struct {
	db     *pgxpool.Pool
	logger logger.Logger
}

func NewChatRepository(db *pgxpool.Pool, logger logger.Logger) chat.Repository {
	return &chatRepository{
		db:     db,
		logger: logger,
	}
}

func (r *chatRepository) Create(ctx context.Context, chatRoom *chat.ChatRoom) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		r.logger.Error("Failed to begin transaction", "error", err)
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Insert chat room
	query := `
		INSERT INTO chat_rooms (id, name, description, is_private, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`

	_, err = tx.Exec(ctx, query,
		chatRoom.ID,
		chatRoom.Name,
		chatRoom.Description,
		chatRoom.IsPrivate,
		chatRoom.CreatedBy,
		chatRoom.CreatedAt,
		chatRoom.UpdatedAt,
	)

	if err != nil {
		r.logger.Error("Failed to create chat room", "error", err, "room_id", chatRoom.ID)
		return fmt.Errorf("failed to create chat room: %w", err)
	}

	// Add members to chat room
	if len(chatRoom.Members) > 0 {
		err = r.addMembersToRoom(ctx, tx, chatRoom.ID, chatRoom.Members)
		if err != nil {
			return err
		}
	}

	if err = tx.Commit(ctx); err != nil {
		r.logger.Error("Failed to commit transaction", "error", err, "room_id", chatRoom.ID)
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	r.logger.Info("Chat room created successfully", "room_id", chatRoom.ID, "name", chatRoom.Name)
	return nil
}

func (r *chatRepository) GetByID(ctx context.Context, id string) (*chat.ChatRoom, error) {
	query := `
		SELECT id, name, description, is_private, created_by, created_at, updated_at
		FROM chat_rooms
		WHERE id = $1
	`

	var chatRoom chat.ChatRoom
	var description *string

	err := r.db.QueryRow(ctx, query, id).Scan(
		&chatRoom.ID,
		&chatRoom.Name,
		&description,
		&chatRoom.IsPrivate,
		&chatRoom.CreatedBy,
		&chatRoom.CreatedAt,
		&chatRoom.UpdatedAt,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, chat.ErrChatRoomNotFound
		}
		r.logger.Error("Failed to get chat room by ID", "error", err, "room_id", id)
		return nil, fmt.Errorf("failed to get chat room by ID: %w", err)
	}

	if description != nil {
		chatRoom.Description = *description
	}

	// Get members
	members, err := r.getChatRoomMembers(ctx, id)
	if err != nil {
		return nil, err
	}
	chatRoom.Members = members

	return &chatRoom, nil
}

func (r *chatRepository) GetUserChatRooms(ctx context.Context, userID string, limit, offset int) ([]*chat.ChatRoom, int, error) {
	// Get total count
	countQuery := `
		SELECT COUNT(DISTINCT cr.id)
		FROM chat_rooms cr
		JOIN chat_room_members crm ON cr.id = crm.chat_room_id
		WHERE crm.user_id = $1
	`

	var total int
	err := r.db.QueryRow(ctx, countQuery, userID).Scan(&total)
	if err != nil {
		r.logger.Error("Failed to get user chat rooms count", "error", err, "user_id", userID)
		return nil, 0, fmt.Errorf("failed to get user chat rooms count: %w", err)
	}

	// Get chat rooms
	query := `
		SELECT DISTINCT cr.id, cr.name, cr.description, cr.is_private, cr.created_by, cr.created_at, cr.updated_at
		FROM chat_rooms cr
		JOIN chat_room_members crm ON cr.id = crm.chat_room_id
		WHERE crm.user_id = $1
		ORDER BY cr.updated_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.Query(ctx, query, userID, limit, offset)
	if err != nil {
		r.logger.Error("Failed to get user chat rooms", "error", err, "user_id", userID)
		return nil, 0, fmt.Errorf("failed to get user chat rooms: %w", err)
	}
	defer rows.Close()

	var chatRooms []*chat.ChatRoom
	for rows.Next() {
		var chatRoom chat.ChatRoom
		var description *string

		err := rows.Scan(
			&chatRoom.ID,
			&chatRoom.Name,
			&description,
			&chatRoom.IsPrivate,
			&chatRoom.CreatedBy,
			&chatRoom.CreatedAt,
			&chatRoom.UpdatedAt,
		)

		if err != nil {
			r.logger.Error("Failed to scan chat room", "error", err, "user_id", userID)
			return nil, 0, fmt.Errorf("failed to scan chat room: %w", err)
		}

		if description != nil {
			chatRoom.Description = *description
		}

		// Get members for each chat room
		members, err := r.getChatRoomMembers(ctx, chatRoom.ID)
		if err != nil {
			return nil, 0, err
		}
		chatRoom.Members = members

		chatRooms = append(chatRooms, &chatRoom)
	}

	if err = rows.Err(); err != nil {
		r.logger.Error("Failed to iterate chat rooms", "error", err, "user_id", userID)
		return nil, 0, fmt.Errorf("failed to iterate chat rooms: %w", err)
	}

	return chatRooms, total, nil
}

func (r *chatRepository) Update(ctx context.Context, chatRoom *chat.ChatRoom) error {
	query := `
		UPDATE chat_rooms
		SET name = $2, description = $3, is_private = $4, updated_at = $5
		WHERE id = $1
	`

	chatRoom.UpdatedAt = time.Now()

	result, err := r.db.Exec(ctx, query,
		chatRoom.ID,
		chatRoom.Name,
		chatRoom.Description,
		chatRoom.IsPrivate,
		chatRoom.UpdatedAt,
	)

	if err != nil {
		r.logger.Error("Failed to update chat room", "error", err, "room_id", chatRoom.ID)
		return fmt.Errorf("failed to update chat room: %w", err)
	}

	if result.RowsAffected() == 0 {
		return chat.ErrChatRoomNotFound
	}

	r.logger.Info("Chat room updated successfully", "room_id", chatRoom.ID)
	return nil
}

func (r *chatRepository) Delete(ctx context.Context, id string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		r.logger.Error("Failed to begin transaction", "error", err)
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Delete chat room members first
	_, err = tx.Exec(ctx, "DELETE FROM chat_room_members WHERE chat_room_id = $1", id)
	if err != nil {
		r.logger.Error("Failed to delete chat room members", "error", err, "room_id", id)
		return fmt.Errorf("failed to delete chat room members: %w", err)
	}

	// Delete chat room
	result, err := tx.Exec(ctx, "DELETE FROM chat_rooms WHERE id = $1", id)
	if err != nil {
		r.logger.Error("Failed to delete chat room", "error", err, "room_id", id)
		return fmt.Errorf("failed to delete chat room: %w", err)
	}

	if result.RowsAffected() == 0 {
		return chat.ErrChatRoomNotFound
	}

	if err = tx.Commit(ctx); err != nil {
		r.logger.Error("Failed to commit transaction", "error", err, "room_id", id)
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	r.logger.Info("Chat room deleted successfully", "room_id", id)
	return nil
}

func (r *chatRepository) AddMember(ctx context.Context, roomID, userID string) error {
	query := `
		INSERT INTO chat_room_members (chat_room_id, user_id, joined_at)
		VALUES ($1, $2, $3)
		ON CONFLICT (chat_room_id, user_id) DO NOTHING
	`

	_, err := r.db.Exec(ctx, query, roomID, userID, time.Now())
	if err != nil {
		r.logger.Error("Failed to add member to chat room", "error", err, "room_id", roomID, "user_id", userID)
		return fmt.Errorf("failed to add member to chat room: %w", err)
	}

	r.logger.Info("Member added to chat room successfully", "room_id", roomID, "user_id", userID)
	return nil
}

func (r *chatRepository) RemoveMember(ctx context.Context, roomID, userID string) error {
	query := `DELETE FROM chat_room_members WHERE chat_room_id = $1 AND user_id = $2`

	result, err := r.db.Exec(ctx, query, roomID, userID)
	if err != nil {
		r.logger.Error("Failed to remove member from chat room", "error", err, "room_id", roomID, "user_id", userID)
		return fmt.Errorf("failed to remove member from chat room: %w", err)
	}

	if result.RowsAffected() == 0 {
		return chat.ErrMemberNotFound
	}

	r.logger.Info("Member removed from chat room successfully", "room_id", roomID, "user_id", userID)
	return nil
}

func (r *chatRepository) IsMember(ctx context.Context, roomID, userID string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM chat_room_members WHERE chat_room_id = $1 AND user_id = $2)`

	var exists bool
	err := r.db.QueryRow(ctx, query, roomID, userID).Scan(&exists)
	if err != nil {
		r.logger.Error("Failed to check if user is member", "error", err, "room_id", roomID, "user_id", userID)
		return false, fmt.Errorf("failed to check if user is member: %w", err)
	}

	return exists, nil
}

func (r *chatRepository) getChatRoomMembers(ctx context.Context, roomID string) ([]string, error) {
	query := `
		SELECT user_id
		FROM chat_room_members
		WHERE chat_room_id = $1
		ORDER BY joined_at ASC
	`

	rows, err := r.db.Query(ctx, query, roomID)
	if err != nil {
		r.logger.Error("Failed to get chat room members", "error", err, "room_id", roomID)
		return nil, fmt.Errorf("failed to get chat room members: %w", err)
	}
	defer rows.Close()

	var members []string
	for rows.Next() {
		var userID string
		if err := rows.Scan(&userID); err != nil {
			r.logger.Error("Failed to scan member", "error", err, "room_id", roomID)
			return nil, fmt.Errorf("failed to scan member: %w", err)
		}
		members = append(members, userID)
	}

	if err = rows.Err(); err != nil {
		r.logger.Error("Failed to iterate members", "error", err, "room_id", roomID)
		return nil, fmt.Errorf("failed to iterate members: %w", err)
	}

	return members, nil
}

func (r *chatRepository) addMembersToRoom(ctx context.Context, tx pgx.Tx, roomID string, members []string) error {
	if len(members) == 0 {
		return nil
	}

	// Build bulk insert query
	query := `
		INSERT INTO chat_room_members (chat_room_id, user_id, joined_at)
		VALUES ($1, $2, $3)
		ON CONFLICT (chat_room_id, user_id) DO NOTHING
	`

	now := time.Now()
	for _, member := range members {
		_, err := tx.Exec(ctx, query, roomID, member, now)
		if err != nil {
			r.logger.Error("Failed to add member to chat room", "error", err, "room_id", roomID, "member", member)
			return fmt.Errorf("failed to add member to chat room: %w", err)
		}
	}

	return nil
}