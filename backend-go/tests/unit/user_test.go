package unit

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"backend-go/internal/domain/user"
)

func TestUserEntity(t *testing.T) {
	t.Run("NewUser creates user with correct fields", func(t *testing.T) {
		id := "test-id"
		username := "testuser"
		email := "test@example.com"
		passwordHash := "hashed-password"

		u := user.NewUser(id, username, email, passwordHash)

		assert.Equal(t, id, u.ID)
		assert.Equal(t, username, u.Username)
		assert.Equal(t, email, u.Email)
		assert.Equal(t, passwordHash, u.PasswordHash)
		assert.True(t, u.IsActive)
		assert.NotZero(t, u.CreatedAt)
		assert.NotZero(t, u.UpdatedAt)
	})

	t.Run("UpdateLastSeen updates timestamp", func(t *testing.T) {
		u := user.NewUser("id", "user", "email", "hash")
		oldTime := u.UpdatedAt

		time.Sleep(1 * time.Millisecond) // Ensure time difference
		u.UpdateLastSeen()

		assert.NotNil(t, u.LastSeenAt)
		assert.True(t, u.UpdatedAt.After(oldTime))
	})

	t.Run("Deactivate sets IsActive to false", func(t *testing.T) {
		u := user.NewUser("id", "user", "email", "hash")
		assert.True(t, u.IsActive)

		u.Deactivate()
		assert.False(t, u.IsActive)
	})

	t.Run("Activate sets IsActive to true", func(t *testing.T) {
		u := user.NewUser("id", "user", "email", "hash")
		u.Deactivate()
		assert.False(t, u.IsActive)

		u.Activate()
		assert.True(t, u.IsActive)
	})

	t.Run("IsOnline returns correct status", func(t *testing.T) {
		u := user.NewUser("id", "user", "email", "hash")
		
		// No last seen time
		assert.False(t, u.IsOnline())

		// Recent last seen
		u.UpdateLastSeen()
		assert.True(t, u.IsOnline())

		// Old last seen
		oldTime := time.Now().Add(-10 * time.Minute)
		u.LastSeenAt = &oldTime
		assert.False(t, u.IsOnline())
	})
}