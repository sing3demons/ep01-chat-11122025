package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// RequestID middleware adds a unique request ID to each request
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check if request ID already exists in header
		requestID := c.GetHeader("X-Request-ID")
		
		// Generate new request ID if not provided
		if requestID == "" {
			requestID = uuid.New().String()
		}

		// Set request ID in context
		c.Set("request_id", requestID)

		// Set request ID in response header
		c.Header("X-Request-ID", requestID)

		c.Next()
	}
}

// GetRequestID extracts request ID from context
func GetRequestID(c *gin.Context) string {
	requestID, exists := c.Get("request_id")
	if !exists {
		return ""
	}

	requestIDStr, ok := requestID.(string)
	if !ok {
		return ""
	}

	return requestIDStr
}