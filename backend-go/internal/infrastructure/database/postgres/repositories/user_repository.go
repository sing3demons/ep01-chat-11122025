package repositories

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"backend-go/internal/domain/user"
	"backend-go/internal/shared/logger"
)

type userRepository struct {
	db     *pgxpool.Pool
	logger logger.Logger
}

func NewUserRepository(db *pgxpool.Pool, logger logger.Logger) user.Repository {
	return &userRepository{
		db:     db,
		logger: logger,
	}
}

func (r *userRepository) Create(ctx context.Context, u *user.User) error {
	query := `
		INSERT INTO users (id, username, email, password_hash, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`

	_, err := r.db.Exec(ctx, query,
		u.ID,
		u.Username,
		u.Email,
		u.PasswordHash,
		u.CreatedAt,
		u.UpdatedAt,
	)

	if err != nil {
		r.logger.Error("Failed to create user", "error", err, "user_id", u.ID)
		return fmt.Errorf("failed to create user: %w", err)
	}

	r.logger.Info("User created successfully", "user_id", u.ID, "username", u.Username)
	return nil
}

func (r *userRepository) GetByID(ctx context.Context, id string) (*user.User, error) {
	query := `
		SELECT id, username, email, password_hash, is_active, last_seen_at, created_at, updated_at
		FROM users
		WHERE id = $1
	`

	var u user.User
	var lastSeenAt *time.Time

	err := r.db.QueryRow(ctx, query, id).Scan(
		&u.ID,
		&u.Username,
		&u.Email,
		&u.PasswordHash,
		&u.IsActive,
		&lastSeenAt,
		&u.CreatedAt,
		&u.UpdatedAt,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, user.ErrUserNotFound
		}
		r.logger.Error("Failed to get user by ID", "error", err, "user_id", id)
		return nil, fmt.Errorf("failed to get user by ID: %w", err)
	}

	u.LastSeenAt = lastSeenAt
	return &u, nil
}

func (r *userRepository) GetByEmail(ctx context.Context, email string) (*user.User, error) {
	query := `
		SELECT id, username, email, password_hash, is_active, last_seen_at, created_at, updated_at
		FROM users
		WHERE email = $1
	`

	var u user.User
	var lastSeenAt *time.Time

	err := r.db.QueryRow(ctx, query, email).Scan(
		&u.ID,
		&u.Username,
		&u.Email,
		&u.PasswordHash,
		&u.IsActive,
		&lastSeenAt,
		&u.CreatedAt,
		&u.UpdatedAt,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, user.ErrUserNotFound
		}
		r.logger.Error("Failed to get user by email", "error", err, "email", email)
		return nil, fmt.Errorf("failed to get user by email: %w", err)
	}

	u.LastSeenAt = lastSeenAt
	return &u, nil
}

func (r *userRepository) GetByUsername(ctx context.Context, username string) (*user.User, error) {
	query := `
		SELECT id, username, email, password_hash, is_active, last_seen_at, created_at, updated_at
		FROM users
		WHERE username = $1
	`

	var u user.User
	var lastSeenAt *time.Time

	err := r.db.QueryRow(ctx, query, username).Scan(
		&u.ID,
		&u.Username,
		&u.Email,
		&u.PasswordHash,
		&u.IsActive,
		&lastSeenAt,
		&u.CreatedAt,
		&u.UpdatedAt,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, user.ErrUserNotFound
		}
		r.logger.Error("Failed to get user by username", "error", err, "username", username)
		return nil, fmt.Errorf("failed to get user by username: %w", err)
	}

	u.LastSeenAt = lastSeenAt
	return &u, nil
}

func (r *userRepository) Update(ctx context.Context, u *user.User) error {
	query := `
		UPDATE users
		SET username = $2, email = $3, password_hash = $4, is_active = $5, last_seen_at = $6, updated_at = $7
		WHERE id = $1
	`

	u.UpdatedAt = time.Now()

	result, err := r.db.Exec(ctx, query,
		u.ID,
		u.Username,
		u.Email,
		u.PasswordHash,
		u.IsActive,
		u.LastSeenAt,
		u.UpdatedAt,
	)

	if err != nil {
		r.logger.Error("Failed to update user", "error", err, "user_id", u.ID)
		return fmt.Errorf("failed to update user: %w", err)
	}

	if result.RowsAffected() == 0 {
		return user.ErrUserNotFound
	}

	r.logger.Info("User updated successfully", "user_id", u.ID)
	return nil
}

func (r *userRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM users WHERE id = $1`

	result, err := r.db.Exec(ctx, query, id)
	if err != nil {
		r.logger.Error("Failed to delete user", "error", err, "user_id", id)
		return fmt.Errorf("failed to delete user: %w", err)
	}

	if result.RowsAffected() == 0 {
		return user.ErrUserNotFound
	}

	r.logger.Info("User deleted successfully", "user_id", id)
	return nil
}

func (r *userRepository) UpdateLastSeen(ctx context.Context, id string) error {
	query := `
		UPDATE users
		SET last_seen_at = $2, updated_at = $3
		WHERE id = $1
	`

	now := time.Now()
	result, err := r.db.Exec(ctx, query, id, now, now)
	if err != nil {
		r.logger.Error("Failed to update user last seen", "error", err, "user_id", id)
		return fmt.Errorf("failed to update user last seen: %w", err)
	}

	if result.RowsAffected() == 0 {
		return user.ErrUserNotFound
	}

	return nil
}

func (r *userRepository) ExistsByEmail(ctx context.Context, email string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)`

	var exists bool
	err := r.db.QueryRow(ctx, query, email).Scan(&exists)
	if err != nil {
		r.logger.Error("Failed to check if user exists by email", "error", err, "email", email)
		return false, fmt.Errorf("failed to check if user exists by email: %w", err)
	}

	return exists, nil
}

func (r *userRepository) ExistsByUsername(ctx context.Context, username string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM users WHERE username = $1)`

	var exists bool
	err := r.db.QueryRow(ctx, query, username).Scan(&exists)
	if err != nil {
		r.logger.Error("Failed to check if user exists by username", "error", err, "username", username)
		return false, fmt.Errorf("failed to check if user exists by username: %w", err)
	}

	return exists, nil
}