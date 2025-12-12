package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"backend-go/internal/application/auth"
	"backend-go/internal/shared/logger"
)

type AuthHandler struct {
	authUseCase auth.UseCase
	logger      logger.Logger
}

func NewAuthHandler(authUseCase auth.UseCase, logger logger.Logger) *AuthHandler {
	return &AuthHandler{
		authUseCase: authUseCase,
		logger:      logger,
	}
}

type RegisterRequest struct {
	Username string `json:"username" binding:"required,min=3,max=50"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type AuthResponse struct {
	Token     string    `json:"token"`
	User      UserInfo  `json:"user"`
	ExpiresAt time.Time `json:"expires_at"`
}

type UserInfo struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
}

// Register handles user registration
func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Invalid registration request", "error", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	result, err := h.authUseCase.Register(c.Request.Context(), auth.RegisterInput{
		Username: req.Username,
		Email:    req.Email,
		Password: req.Password,
	})

	if err != nil {
		h.logger.Error("Registration failed", "error", err, "email", req.Email)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	response := AuthResponse{
		Token:     result.Token,
		ExpiresAt: result.ExpiresAt,
		User: UserInfo{
			ID:       result.User.ID,
			Username: result.User.Username,
			Email:    result.User.Email,
		},
	}

	h.logger.Info("User registered successfully", "user_id", result.User.ID, "email", req.Email)
	c.JSON(http.StatusCreated, response)
}

// Login handles user authentication
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Invalid login request", "error", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	result, err := h.authUseCase.Login(c.Request.Context(), auth.LoginInput{
		Email:    req.Email,
		Password: req.Password,
	})

	if err != nil {
		h.logger.Error("Login failed", "error", err, "email", req.Email)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	response := AuthResponse{
		Token:     result.Token,
		ExpiresAt: result.ExpiresAt,
		User: UserInfo{
			ID:       result.User.ID,
			Username: result.User.Username,
			Email:    result.User.Email,
		},
	}

	h.logger.Info("User logged in successfully", "user_id", result.User.ID, "email", req.Email)
	c.JSON(http.StatusOK, response)
}

// Logout handles user logout
func (h *AuthHandler) Logout(c *gin.Context) {
	token := c.GetHeader("Authorization")
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No token provided"})
		return
	}

	// Remove "Bearer " prefix
	if len(token) > 7 && token[:7] == "Bearer " {
		token = token[7:]
	}

	err := h.authUseCase.Logout(c.Request.Context(), token)
	if err != nil {
		h.logger.Error("Logout failed", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Logout failed"})
		return
	}

	h.logger.Info("User logged out successfully")
	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}

// RefreshToken handles token refresh
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	token := c.GetHeader("Authorization")
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No token provided"})
		return
	}

	// Remove "Bearer " prefix
	if len(token) > 7 && token[:7] == "Bearer " {
		token = token[7:]
	}

	result, err := h.authUseCase.RefreshToken(c.Request.Context(), token)
	if err != nil {
		h.logger.Error("Token refresh failed", "error", err)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
		return
	}

	response := AuthResponse{
		Token:     result.Token,
		ExpiresAt: result.ExpiresAt,
		User: UserInfo{
			ID:       result.User.ID,
			Username: result.User.Username,
			Email:    result.User.Email,
		},
	}

	h.logger.Info("Token refreshed successfully", "user_id", result.User.ID)
	c.JSON(http.StatusOK, response)
}