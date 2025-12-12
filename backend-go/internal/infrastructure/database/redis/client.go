package redis

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"backend-go/internal/shared/config"
)

// Client wraps the Redis client
type Client struct {
	*redis.Client
}

// Connect establishes a connection to Redis
func Connect(cfg config.RedisConfig) (*Client, error) {
	rdb := redis.NewClient(&redis.Options{
		Addr:         fmt.Sprintf("%s:%d", cfg.Host, cfg.Port),
		Password:     cfg.Password,
		DB:           cfg.DB,
		MaxRetries:   cfg.MaxRetries,
		PoolSize:     cfg.PoolSize,
		DialTimeout:  10 * time.Second,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		PoolTimeout:  30 * time.Second,
	})

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to ping Redis: %w", err)
	}

	return &Client{Client: rdb}, nil
}

// Close closes the Redis connection
func Close(client *Client) {
	if client != nil && client.Client != nil {
		client.Client.Close()
	}
}

// Health checks Redis health
func (c *Client) Health(ctx context.Context) error {
	return c.Client.Ping(ctx).Err()
}

// Stats returns Redis statistics
func (c *Client) Stats() *redis.PoolStats {
	return c.Client.PoolStats()
}