package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
	"backend-go/internal/shared/logger"
)

// Logger middleware logs HTTP requests
func Logger(log *logger.Logger) gin.HandlerFunc {
	return gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		// Log using structured logger
		log.LogHTTPRequest(
			param.Method,
			param.Path,
			param.Request.UserAgent(),
			param.ClientIP,
			param.StatusCode,
			param.Latency.Milliseconds(),
		)
		
		// Return empty string since we're using structured logging
		return ""
	})
}

// RequestLogger middleware with more detailed logging
func RequestLogger(log *logger.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery

		// Process request
		c.Next()

		// Calculate latency
		latency := time.Since(start)

		// Get client IP
		clientIP := c.ClientIP()

		// Get user agent
		userAgent := c.Request.UserAgent()

		// Get request ID if available
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			if reqID, exists := c.Get("request_id"); exists {
				requestID = reqID.(string)
			}
		}

		// Build full path
		if raw != "" {
			path = path + "?" + raw
		}

		// Get user ID if authenticated
		userID, _ := c.Get("user_id")

		// Log fields
		fields := map[string]interface{}{
			"method":      c.Request.Method,
			"path":        path,
			"status_code": c.Writer.Status(),
			"latency_ms":  latency.Milliseconds(),
			"client_ip":   clientIP,
			"user_agent":  userAgent,
			"request_id":  requestID,
		}

		if userID != nil {
			fields["user_id"] = userID
		}

		// Get response size
		fields["response_size"] = c.Writer.Size()

		// Log based on status code
		statusCode := c.Writer.Status()
		switch {
		case statusCode >= 500:
			log.WithFields(fields).Error("HTTP request completed with server error")
		case statusCode >= 400:
			log.WithFields(fields).Warn("HTTP request completed with client error")
		case statusCode >= 300:
			log.WithFields(fields).Info("HTTP request completed with redirect")
		default:
			log.WithFields(fields).Info("HTTP request completed")
		}

		// Log slow requests
		if latency > 1*time.Second {
			log.WithFields(fields).Warn("Slow HTTP request detected")
		}
	}
}