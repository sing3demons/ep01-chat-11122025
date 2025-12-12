package unit

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"backend-go/internal/domain/chat"
)

func TestChatRoomEntity(t *testing.T) {
	t.Run("NewChatRoom creates chat room with correct fields", func(t *testing.T) {
		id := "room-id"
		name := "Test Room"
		description := "A test room"
		createdBy := "user-id"
		isPrivate := false

		room := chat.NewChatRoom(id, name, description, createdBy, isPrivate)

		assert.Equal(t, id, room.ID)
		assert.Equal(t, name, room.Name)
		assert.Equal(t, description, room.Description)
		assert.Equal(t, createdBy, room.CreatedBy)
		assert.Equal(t, isPrivate, room.IsPrivate)
		assert.Contains(t, room.Members, createdBy)
		assert.NotZero(t, room.CreatedAt)
		assert.NotZero(t, room.UpdatedAt)
	})

	t.Run("AddMember adds user to room", func(t *testing.T) {
		room := chat.NewChatRoom("id", "name", "desc", "creator", false)
		userID := "new-user"

		err := room.AddMember(userID)

		assert.NoError(t, err)
		assert.Contains(t, room.Members, userID)
		assert.Equal(t, 2, room.MemberCount())
	})

	t.Run("AddMember returns error for existing member", func(t *testing.T) {
		room := chat.NewChatRoom("id", "name", "desc", "creator", false)

		err := room.AddMember("creator")

		assert.Error(t, err)
		assert.Equal(t, chat.ErrAlreadyMember, err)
	})

	t.Run("RemoveMember removes user from room", func(t *testing.T) {
		room := chat.NewChatRoom("id", "name", "desc", "creator", false)
		userID := "user-to-remove"
		room.AddMember(userID)

		err := room.RemoveMember(userID)

		assert.NoError(t, err)
		assert.NotContains(t, room.Members, userID)
		assert.Equal(t, 1, room.MemberCount())
	})

	t.Run("RemoveMember returns error for non-member", func(t *testing.T) {
		room := chat.NewChatRoom("id", "name", "desc", "creator", false)

		err := room.RemoveMember("non-member")

		assert.Error(t, err)
		assert.Equal(t, chat.ErrMemberNotFound, err)
	})

	t.Run("IsMember returns correct status", func(t *testing.T) {
		room := chat.NewChatRoom("id", "name", "desc", "creator", false)

		assert.True(t, room.IsMember("creator"))
		assert.False(t, room.IsMember("non-member"))
	})

	t.Run("IsCreator returns correct status", func(t *testing.T) {
		room := chat.NewChatRoom("id", "name", "desc", "creator", false)

		assert.True(t, room.IsCreator("creator"))
		assert.False(t, room.IsCreator("other-user"))
	})

	t.Run("CanJoin returns correct permissions", func(t *testing.T) {
		// Public room
		publicRoom := chat.NewChatRoom("id", "name", "desc", "creator", false)
		assert.True(t, publicRoom.CanJoin("anyone"))

		// Private room
		privateRoom := chat.NewChatRoom("id", "name", "desc", "creator", true)
		assert.True(t, privateRoom.CanJoin("creator"))
		assert.False(t, privateRoom.CanJoin("outsider"))
	})

	t.Run("Update modifies room properties", func(t *testing.T) {
		room := chat.NewChatRoom("id", "old-name", "old-desc", "creator", false)
		oldUpdatedAt := room.UpdatedAt

		room.Update("new-name", "new-desc", true)

		assert.Equal(t, "new-name", room.Name)
		assert.Equal(t, "new-desc", room.Description)
		assert.True(t, room.IsPrivate)
		assert.True(t, room.UpdatedAt.After(oldUpdatedAt))
	})
}