package auth

import (
	"context"
	"time"

	"backend-go/internal/domain/user"
)

// UseCase defines the interface for authentication use cases
type UseCase interface {
	Register(ctx context.Context, input RegisterInput) (*RegisterOutput, error)
	Login(ctx context.Context, input LoginInput) (*LoginOutput, error)
	Logout(ctx context.Context, token string) error
	RefreshToken(ctx context.Context, token string) (*RefreshTokenOutput, error)
	ValidateToken(ctx context.Context, token string) (*ValidateTokenOutput, error)
}

// RegisterInput represents the input for user registration
type RegisterInput struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

// RegisterOutput represents the output for user registration
type RegisterOutput struct {
	User      *UserOutput `json:"user"`
	Token     string      `json:"token"`
	ExpiresAt time.Time   `json:"expires_at"`
}

// LoginInput represents the input for user login
type LoginInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// LoginOutput represents the output for user login
type LoginOutput struct {
	User      *UserOutput `json:"user"`
	Token     string      `json:"token"`
	ExpiresAt time.Time   `json:"expires_at"`
}

// RefreshTokenOutput represents the output for token refresh
type RefreshTokenOutput struct {
	User      *UserOutput `json:"user"`
	Token     string      `json:"token"`
	ExpiresAt time.Time   `json:"expires_at"`
}

// ValidateTokenOutput represents the output for token validation
type ValidateTokenOutput struct {
	User   *UserOutput `json:"user"`
	Valid  bool        `json:"valid"`
	Claims map[string]interface{} `json:"claims,omitempty"`
}

// UserOutput represents user information in the output
type UserOutput struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
}

// ToUserOutput converts a user entity to user output
func ToUserOutput(u *user.User) *UserOutput {
	return &UserOutput{
		ID:       u.ID,
		Username: u.Username,
		Email:    u.Email,
	}
}