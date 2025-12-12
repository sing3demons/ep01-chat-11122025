package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"backend-go/internal/shared/jwt"
)

// Auth middleware validates JWT tokens
func Auth(jwtService jwt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get token from Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "missing authorization header",
			})
			c.Abort()
			return
		}

		// Check Bearer prefix
		if !strings.HasPrefix(authHeader, "Bearer ") {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "invalid authorization header format",
			})
			c.Abort()
			return
		}

		// Extract token
		token := authHeader[7:] // Remove "Bearer " prefix

		// Validate token
		claims, err := jwtService.ValidateToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "invalid or expired token",
			})
			c.Abort()
			return
		}

		userID, ok := claims["user_id"].(string)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "invalid token claims",
			})
			c.Abort()
			return
		}

		// Set user ID in context
		c.Set("user_id", userID)
		c.Set("token", token)

		c.Next()
	}
}

// OptionalAuth middleware validates JWT tokens but doesn't require them
func OptionalAuth(jwtService jwt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Next()
			return
		}

		if !strings.HasPrefix(authHeader, "Bearer ") {
			c.Next()
			return
		}

		token := authHeader[7:]
		claims, err := jwtService.ValidateToken(token)
		if err != nil {
			c.Next()
			return
		}

		userID, ok := claims["user_id"].(string)
		if !ok {
			c.Next()
			return
		}

		// Set user ID in context if token is valid
		c.Set("user_id", userID)
		c.Set("token", token)

		c.Next()
	}
}

// GetUserID extracts user ID from context
func GetUserID(c *gin.Context) (string, bool) {
	userID, exists := c.Get("user_id")
	if !exists {
		return "", false
	}

	userIDStr, ok := userID.(string)
	return userIDStr, ok
}

// GetToken extracts token from context
func GetToken(c *gin.Context) (string, bool) {
	token, exists := c.Get("token")
	if !exists {
		return "", false
	}

	tokenStr, ok := token.(string)
	return tokenStr, ok
}

// RequireUserID ensures user ID exists in context
func RequireUserID() gin.HandlerFunc {
	return func(c *gin.Context) {
		_, exists := GetUserID(c)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "authentication required",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}