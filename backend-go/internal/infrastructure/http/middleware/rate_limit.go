package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// RateLimiter implements a simple in-memory rate limiter
type RateLimiter struct {
	requests map[string][]time.Time
	mutex    sync.RWMutex
	limit    int
	window   time.Duration
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		requests: make(map[string][]time.Time),
		limit:    limit,
		window:   window,
	}

	// Start cleanup goroutine
	go rl.cleanup()

	return rl
}

// Allow checks if a request is allowed for the given key
func (rl *RateLimiter) Allow(key string) bool {
	rl.mutex.Lock()
	defer rl.mutex.Unlock()

	now := time.Now()
	
	// Get existing requests for this key
	requests, exists := rl.requests[key]
	if !exists {
		requests = make([]time.Time, 0)
	}

	// Remove old requests outside the window
	validRequests := make([]time.Time, 0)
	for _, reqTime := range requests {
		if now.Sub(reqTime) < rl.window {
			validRequests = append(validRequests, reqTime)
		}
	}

	// Check if limit is exceeded
	if len(validRequests) >= rl.limit {
		rl.requests[key] = validRequests
		return false
	}

	// Add current request
	validRequests = append(validRequests, now)
	rl.requests[key] = validRequests

	return true
}

// cleanup removes old entries periodically
func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(rl.window)
	defer ticker.Stop()

	for range ticker.C {
		rl.mutex.Lock()
		now := time.Now()
		
		for key, requests := range rl.requests {
			validRequests := make([]time.Time, 0)
			for _, reqTime := range requests {
				if now.Sub(reqTime) < rl.window {
					validRequests = append(validRequests, reqTime)
				}
			}
			
			if len(validRequests) == 0 {
				delete(rl.requests, key)
			} else {
				rl.requests[key] = validRequests
			}
		}
		
		rl.mutex.Unlock()
	}
}

// Global rate limiter instance
var globalRateLimiter = NewRateLimiter(100, time.Minute) // 100 requests per minute

// RateLimit middleware applies rate limiting
func RateLimit() gin.HandlerFunc {
	return RateLimitWithLimiter(globalRateLimiter)
}

// RateLimitWithLimiter applies rate limiting with custom limiter
func RateLimitWithLimiter(limiter *RateLimiter) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Use client IP as the key
		key := c.ClientIP()

		// Check if request is allowed
		if !limiter.Allow(key) {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":   "rate limit exceeded",
				"message": "too many requests, please try again later",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// RateLimitByUser applies rate limiting per authenticated user
func RateLimitByUser(limit int, window time.Duration) gin.HandlerFunc {
	limiter := NewRateLimiter(limit, window)
	
	return func(c *gin.Context) {
		// Try to get user ID from context
		userID, exists := c.Get("user_id")
		if !exists {
			// Fall back to IP-based rate limiting
			key := c.ClientIP()
			if !limiter.Allow(key) {
				c.JSON(http.StatusTooManyRequests, gin.H{
					"error": "rate limit exceeded",
				})
				c.Abort()
				return
			}
		} else {
			// Use user ID as key
			key := userID.(string)
			if !limiter.Allow(key) {
				c.JSON(http.StatusTooManyRequests, gin.H{
					"error": "rate limit exceeded",
				})
				c.Abort()
				return
			}
		}

		c.Next()
	}
}

// RateLimitByEndpoint applies different rate limits per endpoint
func RateLimitByEndpoint(endpointLimits map[string]struct {
	Limit  int
	Window time.Duration
}) gin.HandlerFunc {
	limiters := make(map[string]*RateLimiter)
	
	// Create limiters for each endpoint
	for endpoint, config := range endpointLimits {
		limiters[endpoint] = NewRateLimiter(config.Limit, config.Window)
	}

	return func(c *gin.Context) {
		endpoint := c.Request.Method + " " + c.FullPath()
		
		// Check if we have a specific limiter for this endpoint
		limiter, exists := limiters[endpoint]
		if !exists {
			// Use global limiter as fallback
			limiter = globalRateLimiter
		}

		// Use client IP as key
		key := c.ClientIP()
		
		// Try to get user ID for authenticated requests
		if userID, exists := c.Get("user_id"); exists {
			key = userID.(string)
		}

		if !limiter.Allow(key) {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "rate limit exceeded for this endpoint",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}