package integration

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"backend-go/internal/infrastructure/cache"
)

func TestCacheServiceWithMock(t *testing.T) {
	resetMocks()

	cacheService := cache.NewService(testRedis)

	t.Run("Set and Get String", func(t *testing.T) {
		resetMocks()

		key := "test:key"
		value := "test value"
		expiration := time.Hour

		// Mock SET operation
		redisMock.ExpectSet(key, value, expiration).SetVal("OK")

		// Mock GET operation
		redisMock.ExpectGet(key).SetVal(value)

		// Execute SET
		err := cacheService.SetString(key, value, expiration)
		require.NoError(t, err)

		// Execute GET
		result, err := cacheService.GetString(key)
		require.NoError(t, err)
		assert.Equal(t, value, result)
	})

	t.Run("Set User Online", func(t *testing.T) {
		resetMocks()

		userID := "user-123"
		expectedKey := "user:online:" + userID

		// Mock SET operation
		redisMock.ExpectSet(expectedKey, "true", 24*time.Hour).SetVal("OK")

		// Execute
		err := cacheService.SetUserOnline(userID)
		require.NoError(t, err)
	})

	t.Run("Set User Offline", func(t *testing.T) {
		resetMocks()

		userID := "user-123"
		expectedKey := "user:online:" + userID

		// Mock DEL operation
		redisMock.ExpectDel(expectedKey).SetVal(1)

		// Execute
		err := cacheService.SetUserOffline(userID)
		require.NoError(t, err)
	})

	t.Run("Is User Online - True", func(t *testing.T) {
		resetMocks()

		userID := "user-123"
		expectedKey := "user:online:" + userID

		// Mock EXISTS operation
		redisMock.ExpectExists(expectedKey).SetVal(1)

		// Execute
		isOnline, err := cacheService.IsUserOnline(userID)
		require.NoError(t, err)
		assert.True(t, isOnline)
	})

	t.Run("Is User Online - False", func(t *testing.T) {
		resetMocks()

		userID := "user-123"
		expectedKey := "user:online:" + userID

		// Mock EXISTS operation (key doesn't exist)
		redisMock.ExpectExists(expectedKey).SetVal(0)

		// Execute
		isOnline, err := cacheService.IsUserOnline(userID)
		require.NoError(t, err)
		assert.False(t, isOnline)
	})

	t.Run("Set User Session", func(t *testing.T) {
		resetMocks()

		userID := "user-123"
		sessionID := "session-456"
		expiration := time.Hour
		expectedKey := "session:" + sessionID

		// Mock SET operation
		redisMock.ExpectSet(expectedKey, userID, expiration).SetVal("OK")

		// Execute
		err := cacheService.SetUserSession(userID, sessionID, expiration)
		require.NoError(t, err)
	})

	t.Run("Get User Session", func(t *testing.T) {
		resetMocks()

		userID := "user-123"
		sessionID := "session-456"
		expectedKey := "session:" + sessionID

		// Mock GET operation
		redisMock.ExpectGet(expectedKey).SetVal(userID)

		// Execute
		result, err := cacheService.GetUserSession(sessionID)
		require.NoError(t, err)
		assert.Equal(t, userID, result)
	})

	t.Run("Delete User Session", func(t *testing.T) {
		resetMocks()

		sessionID := "session-456"
		expectedKey := "session:" + sessionID

		// Mock DEL operation
		redisMock.ExpectDel(expectedKey).SetVal(1)

		// Execute
		err := cacheService.DeleteUserSession(sessionID)
		require.NoError(t, err)
	})

	t.Run("Set Typing Indicator", func(t *testing.T) {
		resetMocks()

		chatRoomID := "room-123"
		userID := "user-456"
		expectedKey := "typing:" + chatRoomID + ":" + userID

		// Mock SET operation with 10 second expiration
		redisMock.ExpectSet(expectedKey, "true", 10*time.Second).SetVal("OK")

		// Execute
		err := cacheService.SetTypingIndicator(chatRoomID, userID)
		require.NoError(t, err)
	})

	t.Run("Remove Typing Indicator", func(t *testing.T) {
		resetMocks()

		chatRoomID := "room-123"
		userID := "user-456"
		expectedKey := "typing:" + chatRoomID + ":" + userID

		// Mock DEL operation
		redisMock.ExpectDel(expectedKey).SetVal(1)

		// Execute
		err := cacheService.RemoveTypingIndicator(chatRoomID, userID)
		require.NoError(t, err)
	})

	t.Run("Add User To Chat Room", func(t *testing.T) {
		resetMocks()

		chatRoomID := "room-123"
		userID := "user-456"
		expectedKey := "chatroom:online:" + chatRoomID

		// Mock SADD operation
		redisMock.ExpectSAdd(expectedKey, userID).SetVal(1)

		// Mock EXPIRE operation
		redisMock.ExpectExpire(expectedKey, time.Hour).SetVal(true)

		// Execute
		err := cacheService.AddUserToChatRoom(chatRoomID, userID)
		require.NoError(t, err)
	})

	t.Run("Remove User From Chat Room", func(t *testing.T) {
		resetMocks()

		chatRoomID := "room-123"
		userID := "user-456"
		expectedKey := "chatroom:online:" + chatRoomID

		// Mock SREM operation
		redisMock.ExpectSRem(expectedKey, userID).SetVal(1)

		// Execute
		err := cacheService.RemoveUserFromChatRoom(chatRoomID, userID)
		require.NoError(t, err)
	})

	t.Run("Get Chat Room Online Users", func(t *testing.T) {
		resetMocks()

		chatRoomID := "room-123"
		expectedKey := "chatroom:online:" + chatRoomID
		expectedUsers := []string{"user-1", "user-2", "user-3"}

		// Mock SMEMBERS operation
		redisMock.ExpectSMembers(expectedKey).SetVal(expectedUsers)

		// Execute
		users, err := cacheService.GetChatRoomOnlineUsers(chatRoomID)
		require.NoError(t, err)
		assert.Equal(t, expectedUsers, users)
	})

	t.Run("Increment Counter", func(t *testing.T) {
		resetMocks()

		key := "counter:test"
		expiration := time.Hour

		// Mock INCR operation
		redisMock.ExpectIncr(key).SetVal(1)

		// Mock EXPIRE operation
		redisMock.ExpectExpire(key, expiration).SetVal(true)

		// Execute
		count, err := cacheService.IncrementCounter(key, expiration)
		require.NoError(t, err)
		assert.Equal(t, int64(1), count)
	})

	t.Run("Get Counter", func(t *testing.T) {
		resetMocks()

		key := "counter:test"
		expectedCount := int64(5)

		// Mock GET operation
		redisMock.ExpectGet(key).SetVal("5")

		// Execute
		count, err := cacheService.GetCounter(key)
		require.NoError(t, err)
		assert.Equal(t, expectedCount, count)
	})

	t.Run("Get Counter - Key Not Exists", func(t *testing.T) {
		resetMocks()

		key := "counter:nonexistent"

		// Mock GET operation (key doesn't exist)
		redisMock.ExpectGet(key).RedisNil()

		// Execute
		count, err := cacheService.GetCounter(key)
		require.NoError(t, err)
		assert.Equal(t, int64(0), count) // Should return 0 for non-existent keys
	})
}