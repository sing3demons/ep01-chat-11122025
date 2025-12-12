package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// Service implements caching operations using Redis
type Service struct {
	client *redis.Client
}

// NewService creates a new cache service
func NewService(client *redis.Client) *Service {
	return &Service{
		client: client,
	}
}

// Set stores a value in cache with expiration
func (s *Service) Set(key string, value interface{}, expiration time.Duration) error {
	ctx := context.Background()
	
	// Serialize value to JSON
	data, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("failed to marshal value: %w", err)
	}
	
	err = s.client.Set(ctx, key, data, expiration).Err()
	if err != nil {
		return fmt.Errorf("failed to set cache: %w", err)
	}
	
	return nil
}

// Get retrieves a value from cache
func (s *Service) Get(key string) (interface{}, error) {
	ctx := context.Background()
	
	data, err := s.client.Get(ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return nil, fmt.Errorf("key not found")
		}
		return nil, fmt.Errorf("failed to get cache: %w", err)
	}
	
	var value interface{}
	err = json.Unmarshal([]byte(data), &value)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal value: %w", err)
	}
	
	return value, nil
}

// GetString retrieves a string value from cache
func (s *Service) GetString(key string) (string, error) {
	ctx := context.Background()
	
	value, err := s.client.Get(ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return "", fmt.Errorf("key not found")
		}
		return "", fmt.Errorf("failed to get cache: %w", err)
	}
	
	return value, nil
}

// SetString stores a string value in cache
func (s *Service) SetString(key, value string, expiration time.Duration) error {
	ctx := context.Background()
	
	err := s.client.Set(ctx, key, value, expiration).Err()
	if err != nil {
		return fmt.Errorf("failed to set cache: %w", err)
	}
	
	return nil
}

// Delete removes a value from cache
func (s *Service) Delete(key string) error {
	ctx := context.Background()
	
	err := s.client.Del(ctx, key).Err()
	if err != nil {
		return fmt.Errorf("failed to delete cache: %w", err)
	}
	
	return nil
}

// Exists checks if a key exists in cache
func (s *Service) Exists(key string) (bool, error) {
	ctx := context.Background()
	
	count, err := s.client.Exists(ctx, key).Result()
	if err != nil {
		return false, fmt.Errorf("failed to check existence: %w", err)
	}
	
	return count > 0, nil
}

// SetUserOnline sets user online status in cache
func (s *Service) SetUserOnline(userID string) error {
	key := fmt.Sprintf("user:online:%s", userID)
	return s.SetString(key, "true", 24*time.Hour)
}

// SetUserOffline sets user offline status in cache
func (s *Service) SetUserOffline(userID string) error {
	key := fmt.Sprintf("user:online:%s", userID)
	return s.Delete(key)
}

// IsUserOnline checks if user is online from cache
func (s *Service) IsUserOnline(userID string) (bool, error) {
	key := fmt.Sprintf("user:online:%s", userID)
	return s.Exists(key)
}

// SetUserSession stores user session information
func (s *Service) SetUserSession(userID, sessionID string, expiration time.Duration) error {
	key := fmt.Sprintf("session:%s", sessionID)
	return s.SetString(key, userID, expiration)
}

// GetUserSession retrieves user session information
func (s *Service) GetUserSession(sessionID string) (string, error) {
	key := fmt.Sprintf("session:%s", sessionID)
	return s.GetString(key)
}

// DeleteUserSession removes user session
func (s *Service) DeleteUserSession(sessionID string) error {
	key := fmt.Sprintf("session:%s", sessionID)
	return s.Delete(key)
}

// SetChatRoomOnlineUsers stores online users for a chat room
func (s *Service) SetChatRoomOnlineUsers(chatRoomID string, userIDs []string) error {
	ctx := context.Background()
	key := fmt.Sprintf("chatroom:online:%s", chatRoomID)
	
	// Use Redis Set to store unique user IDs
	pipe := s.client.Pipeline()
	pipe.Del(ctx, key) // Clear existing set
	
	if len(userIDs) > 0 {
		pipe.SAdd(ctx, key, userIDs)
		pipe.Expire(ctx, key, 1*time.Hour)
	}
	
	_, err := pipe.Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to set chat room online users: %w", err)
	}
	
	return nil
}

// GetChatRoomOnlineUsers retrieves online users for a chat room
func (s *Service) GetChatRoomOnlineUsers(chatRoomID string) ([]string, error) {
	ctx := context.Background()
	key := fmt.Sprintf("chatroom:online:%s", chatRoomID)
	
	userIDs, err := s.client.SMembers(ctx, key).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get chat room online users: %w", err)
	}
	
	return userIDs, nil
}

// AddUserToChatRoom adds a user to chat room online users
func (s *Service) AddUserToChatRoom(chatRoomID, userID string) error {
	ctx := context.Background()
	key := fmt.Sprintf("chatroom:online:%s", chatRoomID)
	
	err := s.client.SAdd(ctx, key, userID).Err()
	if err != nil {
		return fmt.Errorf("failed to add user to chat room: %w", err)
	}
	
	// Set expiration
	s.client.Expire(ctx, key, 1*time.Hour)
	
	return nil
}

// RemoveUserFromChatRoom removes a user from chat room online users
func (s *Service) RemoveUserFromChatRoom(chatRoomID, userID string) error {
	ctx := context.Background()
	key := fmt.Sprintf("chatroom:online:%s", chatRoomID)
	
	err := s.client.SRem(ctx, key, userID).Err()
	if err != nil {
		return fmt.Errorf("failed to remove user from chat room: %w", err)
	}
	
	return nil
}

// SetTypingIndicator sets typing indicator for a user in a chat room
func (s *Service) SetTypingIndicator(chatRoomID, userID string) error {
	key := fmt.Sprintf("typing:%s:%s", chatRoomID, userID)
	return s.SetString(key, "true", 10*time.Second) // 10 seconds expiration
}

// RemoveTypingIndicator removes typing indicator
func (s *Service) RemoveTypingIndicator(chatRoomID, userID string) error {
	key := fmt.Sprintf("typing:%s:%s", chatRoomID, userID)
	return s.Delete(key)
}

// GetTypingUsers gets all users currently typing in a chat room
func (s *Service) GetTypingUsers(chatRoomID string) ([]string, error) {
	ctx := context.Background()
	pattern := fmt.Sprintf("typing:%s:*", chatRoomID)
	
	keys, err := s.client.Keys(ctx, pattern).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get typing users: %w", err)
	}
	
	var userIDs []string
	for _, key := range keys {
		// Extract user ID from key (typing:chatRoomID:userID)
		parts := []rune(key)
		if len(parts) > len(pattern)-1 {
			userID := string(parts[len(pattern)-1:])
			userIDs = append(userIDs, userID)
		}
	}
	
	return userIDs, nil
}

// IncrementCounter increments a counter
func (s *Service) IncrementCounter(key string, expiration time.Duration) (int64, error) {
	ctx := context.Background()
	
	pipe := s.client.Pipeline()
	incr := pipe.Incr(ctx, key)
	pipe.Expire(ctx, key, expiration)
	
	_, err := pipe.Exec(ctx)
	if err != nil {
		return 0, fmt.Errorf("failed to increment counter: %w", err)
	}
	
	return incr.Val(), nil
}

// GetCounter gets counter value
func (s *Service) GetCounter(key string) (int64, error) {
	ctx := context.Background()
	
	val, err := s.client.Get(ctx, key).Int64()
	if err != nil {
		if err == redis.Nil {
			return 0, nil
		}
		return 0, fmt.Errorf("failed to get counter: %w", err)
	}
	
	return val, nil
}