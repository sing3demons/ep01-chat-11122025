package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"backend-go/internal/shared/config"
)

// CORS middleware handles Cross-Origin Resource Sharing
func CORS(cfg config.CORSConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		
		// Check if origin is allowed
		if isOriginAllowed(origin, cfg.AllowedOrigins) {
			c.Header("Access-Control-Allow-Origin", origin)
		}

		// Set allowed methods
		c.Header("Access-Control-Allow-Methods", strings.Join(cfg.AllowedMethods, ", "))

		// Set allowed headers
		c.Header("Access-Control-Allow-Headers", strings.Join(cfg.AllowedHeaders, ", "))

		// Set credentials
		if cfg.AllowCredentials {
			c.Header("Access-Control-Allow-Credentials", "true")
		}

		// Set max age for preflight requests
		c.Header("Access-Control-Max-Age", "86400") // 24 hours

		// Handle preflight requests
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

// isOriginAllowed checks if the origin is in the allowed list
func isOriginAllowed(origin string, allowedOrigins []string) bool {
	if origin == "" {
		return false
	}

	for _, allowed := range allowedOrigins {
		if allowed == "*" {
			return true
		}
		if allowed == origin {
			return true
		}
		// Support wildcard subdomains (e.g., *.example.com)
		if strings.HasPrefix(allowed, "*.") {
			domain := allowed[2:]
			if strings.HasSuffix(origin, "."+domain) || origin == domain {
				return true
			}
		}
	}

	return false
}