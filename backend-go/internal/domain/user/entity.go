package user

import (
	"errors"
	"time"
)

var (
	ErrUserNotFound      = errors.New("user not found")
	ErrInvalidEmail      = errors.New("invalid email")
	ErrInvalidUsername   = errors.New("invalid username")
	ErrInvalidPassword   = errors.New("invalid password")
	ErrUserAlreadyExists = errors.New("user already exists")
)

// User represents a user entity
type User struct {
	ID           string     `json:"id"`
	Username     string     `json:"username"`
	Email        string     `json:"email"`
	PasswordHash string     `json:"-"`
	IsActive     bool       `json:"is_active"`
	LastSeenAt   *time.Time `json:"last_seen_at,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

// NewUser creates a new user instance
func NewUser(id, username, email, passwordHash string) *User {
	now := time.Now()
	return &User{
		ID:           id,
		Username:     username,
		Email:        email,
		PasswordHash: passwordHash,
		IsActive:     true,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
}

// UpdateLastSeen updates the user's last seen timestamp
func (u *User) UpdateLastSeen() {
	now := time.Now()
	u.LastSeenAt = &now
	u.UpdatedAt = now
}

// Deactivate deactivates the user account
func (u *User) Deactivate() {
	u.IsActive = false
	u.UpdatedAt = time.Now()
}

// Activate activates the user account
func (u *User) Activate() {
	u.IsActive = true
	u.UpdatedAt = time.Now()
}

// IsOnline checks if user is considered online (last seen within 5 minutes)
func (u *User) IsOnline() bool {
	if u.LastSeenAt == nil {
		return false
	}
	return time.Since(*u.LastSeenAt) <= 5*time.Minute
}