package auth

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"backend-go/internal/domain/user"
	"backend-go/internal/shared/jwt"
	"backend-go/internal/shared/logger"
	"backend-go/internal/shared/validation"
)

type useCase struct {
	userRepo  user.Repository
	jwtSvc    jwt.Service
	validator validation.Validator
	logger    logger.Logger
}

// NewUseCase creates a new authentication use case
func NewUseCase(
	userRepo user.Repository,
	jwtSvc jwt.Service,
	validator validation.Validator,
	logger logger.Logger,
) UseCase {
	return &useCase{
		userRepo:  userRepo,
		jwtSvc:    jwtSvc,
		validator: validator,
		logger:    logger,
	}
}

func (uc *useCase) Register(ctx context.Context, input RegisterInput) (*RegisterOutput, error) {
	// Validate input
	if err := uc.validator.Struct(input); err != nil {
		uc.logger.Error("Invalid registration input", "error", err)
		return nil, fmt.Errorf("invalid input: %w", err)
	}

	// Check if user already exists by email
	exists, err := uc.userRepo.ExistsByEmail(ctx, input.Email)
	if err != nil {
		uc.logger.Error("Failed to check if user exists by email", "error", err, "email", input.Email)
		return nil, fmt.Errorf("failed to check user existence: %w", err)
	}
	if exists {
		return nil, user.ErrUserAlreadyExists
	}

	// Check if username is taken
	exists, err = uc.userRepo.ExistsByUsername(ctx, input.Username)
	if err != nil {
		uc.logger.Error("Failed to check if user exists by username", "error", err, "username", input.Username)
		return nil, fmt.Errorf("failed to check username availability: %w", err)
	}
	if exists {
		return nil, fmt.Errorf("username already taken")
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		uc.logger.Error("Failed to hash password", "error", err)
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Create user
	userID := uuid.New().String()
	newUser := user.NewUser(userID, input.Username, input.Email, string(hashedPassword))

	if err := uc.userRepo.Create(ctx, newUser); err != nil {
		uc.logger.Error("Failed to create user", "error", err, "email", input.Email)
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	// Generate JWT token
	token, expiresAt, err := uc.jwtSvc.GenerateToken(userID, input.Email)
	if err != nil {
		uc.logger.Error("Failed to generate token", "error", err, "user_id", userID)
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	uc.logger.Info("User registered successfully", "user_id", userID, "email", input.Email)

	return &RegisterOutput{
		User:      ToUserOutput(newUser),
		Token:     token,
		ExpiresAt: expiresAt,
	}, nil
}

func (uc *useCase) Login(ctx context.Context, input LoginInput) (*LoginOutput, error) {
	// Validate input
	if err := uc.validator.Struct(input); err != nil {
		uc.logger.Error("Invalid login input", "error", err)
		return nil, fmt.Errorf("invalid input: %w", err)
	}

	// Get user by email
	u, err := uc.userRepo.GetByEmail(ctx, input.Email)
	if err != nil {
		if err == user.ErrUserNotFound {
			uc.logger.Warn("Login attempt with non-existent email", "email", input.Email)
			return nil, fmt.Errorf("invalid credentials")
		}
		uc.logger.Error("Failed to get user by email", "error", err, "email", input.Email)
		return nil, fmt.Errorf("failed to authenticate: %w", err)
	}

	// Check if user is active
	if !u.IsActive {
		uc.logger.Warn("Login attempt with inactive account", "user_id", u.ID, "email", input.Email)
		return nil, fmt.Errorf("account is deactivated")
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(input.Password)); err != nil {
		uc.logger.Warn("Login attempt with invalid password", "user_id", u.ID, "email", input.Email)
		return nil, fmt.Errorf("invalid credentials")
	}

	// Update last seen
	if err := uc.userRepo.UpdateLastSeen(ctx, u.ID); err != nil {
		uc.logger.Error("Failed to update last seen", "error", err, "user_id", u.ID)
		// Don't fail login for this error
	}

	// Generate JWT token
	token, expiresAt, err := uc.jwtSvc.GenerateToken(u.ID, u.Email)
	if err != nil {
		uc.logger.Error("Failed to generate token", "error", err, "user_id", u.ID)
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	uc.logger.Info("User logged in successfully", "user_id", u.ID, "email", input.Email)

	return &LoginOutput{
		User:      ToUserOutput(u),
		Token:     token,
		ExpiresAt: expiresAt,
	}, nil
}

func (uc *useCase) Logout(ctx context.Context, token string) error {
	// Validate and parse token
	claims, err := uc.jwtSvc.ValidateToken(token)
	if err != nil {
		uc.logger.Error("Invalid token for logout", "error", err)
		return fmt.Errorf("invalid token: %w", err)
	}

	userID, ok := claims["user_id"].(string)
	if !ok {
		uc.logger.Error("Invalid user_id in token claims")
		return fmt.Errorf("invalid token claims")
	}

	// Blacklist token (if JWT service supports it)
	if err := uc.jwtSvc.BlacklistToken(token); err != nil {
		uc.logger.Error("Failed to blacklist token", "error", err, "user_id", userID)
		// Don't fail logout for this error, just log it
	}

	uc.logger.Info("User logged out successfully", "user_id", userID)
	return nil
}

func (uc *useCase) RefreshToken(ctx context.Context, token string) (*RefreshTokenOutput, error) {
	// Validate current token
	claims, err := uc.jwtSvc.ValidateToken(token)
	if err != nil {
		uc.logger.Error("Invalid token for refresh", "error", err)
		return nil, fmt.Errorf("invalid token: %w", err)
	}

	userID, ok := claims["user_id"].(string)
	if !ok {
		uc.logger.Error("Invalid user_id in token claims")
		return nil, fmt.Errorf("invalid token claims")
	}

	email, ok := claims["email"].(string)
	if !ok {
		uc.logger.Error("Invalid email in token claims")
		return nil, fmt.Errorf("invalid token claims")
	}

	// Get user to ensure they still exist and are active
	u, err := uc.userRepo.GetByID(ctx, userID)
	if err != nil {
		if err == user.ErrUserNotFound {
			uc.logger.Warn("Token refresh attempt for non-existent user", "user_id", userID)
			return nil, fmt.Errorf("user not found")
		}
		uc.logger.Error("Failed to get user for token refresh", "error", err, "user_id", userID)
		return nil, fmt.Errorf("failed to refresh token: %w", err)
	}

	if !u.IsActive {
		uc.logger.Warn("Token refresh attempt for inactive user", "user_id", userID)
		return nil, fmt.Errorf("account is deactivated")
	}

	// Blacklist old token
	if err := uc.jwtSvc.BlacklistToken(token); err != nil {
		uc.logger.Error("Failed to blacklist old token", "error", err, "user_id", userID)
		// Continue with refresh even if blacklisting fails
	}

	// Generate new token
	newToken, expiresAt, err := uc.jwtSvc.GenerateToken(userID, email)
	if err != nil {
		uc.logger.Error("Failed to generate new token", "error", err, "user_id", userID)
		return nil, fmt.Errorf("failed to generate new token: %w", err)
	}

	uc.logger.Info("Token refreshed successfully", "user_id", userID)

	return &RefreshTokenOutput{
		User:      ToUserOutput(u),
		Token:     newToken,
		ExpiresAt: expiresAt,
	}, nil
}

func (uc *useCase) ValidateToken(ctx context.Context, token string) (*ValidateTokenOutput, error) {
	// Validate token
	claims, err := uc.jwtSvc.ValidateToken(token)
	if err != nil {
		uc.logger.Debug("Token validation failed", "error", err)
		return &ValidateTokenOutput{
			Valid: false,
		}, nil
	}

	userID, ok := claims["user_id"].(string)
	if !ok {
		uc.logger.Error("Invalid user_id in token claims")
		return &ValidateTokenOutput{
			Valid: false,
		}, nil
	}

	// Get user to ensure they still exist and are active
	u, err := uc.userRepo.GetByID(ctx, userID)
	if err != nil {
		if err == user.ErrUserNotFound {
			uc.logger.Debug("Token validation failed: user not found", "user_id", userID)
			return &ValidateTokenOutput{
				Valid: false,
			}, nil
		}
		uc.logger.Error("Failed to get user for token validation", "error", err, "user_id", userID)
		return nil, fmt.Errorf("failed to validate token: %w", err)
	}

	if !u.IsActive {
		uc.logger.Debug("Token validation failed: user inactive", "user_id", userID)
		return &ValidateTokenOutput{
			Valid: false,
		}, nil
	}

	return &ValidateTokenOutput{
		User:   ToUserOutput(u),
		Valid:  true,
		Claims: claims,
	}, nil
}