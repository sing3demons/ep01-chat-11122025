package e2e

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type ChatRoomResponse struct {
	ID            string `json:"id"`
	Name          *string `json:"name"`
	Type          string `json:"type"`
	CreatedBy     string `json:"created_by"`
	CreatedAt     string `json:"created_at"`
	UpdatedAt     string `json:"updated_at"`
	LastMessageAt string `json:"last_message_at"`
}

type MessageResponse struct {
	ID         string `json:"id"`
	Content    string `json:"content"`
	SenderID   string `json:"sender_id"`
	ChatRoomID string `json:"chat_room_id"`
	Status     string `json:"status"`
	CreatedAt  string `json:"created_at"`
	UpdatedAt  string `json:"updated_at"`
}

func TestChatFlowE2E(t *testing.T) {
	require.NoError(t, cleanupTables())
	require.NoError(t, waitForServer())

	// Create two users
	user1Token := createAndLoginUser(t, "chatuser1", "chat1@example.com", "Password123")
	user2Token := createAndLoginUser(t, "chatuser2", "chat2@example.com", "Password123")

	var groupChatID string
	var directChatID string

	t.Run("Create Group Chat", func(t *testing.T) {
		createChatPayload := map[string]interface{}{
			"name":            "Test Group Chat",
			"type":            "group",
			"participant_ids": []string{}, // Will add participants later
		}

		createChatBody, _ := json.Marshal(createChatPayload)
		req, _ := http.NewRequest("POST", baseURL+"/api/v1/chatrooms", bytes.NewBuffer(createChatBody))
		req.Header.Set("Authorization", "Bearer "+user1Token)
		req.Header.Set("Content-Type", "application/json")

		resp, err := testClient.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusCreated, resp.StatusCode)

		var chatResponse ChatRoomResponse
		err = json.NewDecoder(resp.Body).Decode(&chatResponse)
		require.NoError(t, err)

		assert.Equal(t, "group", chatResponse.Type)
		assert.NotNil(t, chatResponse.Name)
		assert.Equal(t, "Test Group Chat", *chatResponse.Name)
		assert.NotEmpty(t, chatResponse.ID)

		groupChatID = chatResponse.ID
	})

	t.Run("Join Group Chat", func(t *testing.T) {
		// User 2 joins the group chat
		req, _ := http.NewRequest("POST", baseURL+"/api/v1/chatrooms/"+groupChatID+"/join", nil)
		req.Header.Set("Authorization", "Bearer "+user2Token)

		resp, err := testClient.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var response map[string]interface{}
		err = json.NewDecoder(resp.Body).Decode(&response)
		require.NoError(t, err)

		assert.Contains(t, response["message"], "joined")
	})

	t.Run("Get Chat Room Details", func(t *testing.T) {
		req, _ := http.NewRequest("GET", baseURL+"/api/v1/chatrooms/"+groupChatID, nil)
		req.Header.Set("Authorization", "Bearer "+user1Token)

		resp, err := testClient.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var response map[string]interface{}
		err = json.NewDecoder(resp.Body).Decode(&response)
		require.NoError(t, err)

		assert.Equal(t, groupChatID, response["id"])
		assert.Equal(t, "Test Group Chat", response["name"])

		participants, ok := response["participants"].([]interface{})
		assert.True(t, ok)
		assert.Len(t, participants, 2) // Both users should be participants
	})

	t.Run("Send Message to Group Chat", func(t *testing.T) {
		sendMessagePayload := map[string]string{
			"content": "Hello from user 1!",
		}

		sendMessageBody, _ := json.Marshal(sendMessagePayload)
		req, _ := http.NewRequest("POST", baseURL+"/api/v1/chatrooms/"+groupChatID+"/messages", bytes.NewBuffer(sendMessageBody))
		req.Header.Set("Authorization", "Bearer "+user1Token)
		req.Header.Set("Content-Type", "application/json")

		resp, err := testClient.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusCreated, resp.StatusCode)

		var messageResponse MessageResponse
		err = json.NewDecoder(resp.Body).Decode(&messageResponse)
		require.NoError(t, err)

		assert.Equal(t, "Hello from user 1!", messageResponse.Content)
		assert.Equal(t, groupChatID, messageResponse.ChatRoomID)
		assert.Equal(t, "sent", messageResponse.Status)
	})

	t.Run("Get Chat Room Messages", func(t *testing.T) {
		req, _ := http.NewRequest("GET", baseURL+"/api/v1/chatrooms/"+groupChatID+"/messages", nil)
		req.Header.Set("Authorization", "Bearer "+user2Token)

		resp, err := testClient.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var response map[string]interface{}
		err = json.NewDecoder(resp.Body).Decode(&response)
		require.NoError(t, err)

		messages, ok := response["messages"].([]interface{})
		assert.True(t, ok)
		assert.Greater(t, len(messages), 0)

		// Check the first message
		firstMessage := messages[0].(map[string]interface{})
		assert.Equal(t, "Hello from user 1!", firstMessage["content"])
	})

	t.Run("Create Direct Chat", func(t *testing.T) {
		// Get user2's ID first by searching
		req, _ := http.NewRequest("GET", baseURL+"/api/v1/users/search?q=chatuser2", nil)
		req.Header.Set("Authorization", "Bearer "+user1Token)

		resp, err := testClient.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		var searchResponse map[string]interface{}
		err = json.NewDecoder(resp.Body).Decode(&searchResponse)
		require.NoError(t, err)

		users := searchResponse["users"].([]interface{})
		user2Data := users[0].(map[string]interface{})
		user2ID := user2Data["id"].(string)

		// Create direct chat
		createDirectChatPayload := map[string]interface{}{
			"type":            "direct",
			"participant_ids": []string{user2ID},
		}

		createDirectChatBody, _ := json.Marshal(createDirectChatPayload)
		req, _ = http.NewRequest("POST", baseURL+"/api/v1/chatrooms", bytes.NewBuffer(createDirectChatBody))
		req.Header.Set("Authorization", "Bearer "+user1Token)
		req.Header.Set("Content-Type", "application/json")

		resp, err = testClient.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusCreated, resp.StatusCode)

		var chatResponse ChatRoomResponse
		err = json.NewDecoder(resp.Body).Decode(&chatResponse)
		require.NoError(t, err)

		assert.Equal(t, "direct", chatResponse.Type)
		assert.Nil(t, chatResponse.Name) // Direct chats don't have names

		directChatID = chatResponse.ID
	})

	t.Run("Send Message to Direct Chat", func(t *testing.T) {
		sendMessagePayload := map[string]string{
			"content": "Hello in direct chat!",
		}

		sendMessageBody, _ := json.Marshal(sendMessagePayload)
		req, _ := http.NewRequest("POST", baseURL+"/api/v1/chatrooms/"+directChatID+"/messages", bytes.NewBuffer(sendMessageBody))
		req.Header.Set("Authorization", "Bearer "+user1Token)
		req.Header.Set("Content-Type", "application/json")

		resp, err := testClient.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusCreated, resp.StatusCode)

		var messageResponse MessageResponse
		err = json.NewDecoder(resp.Body).Decode(&messageResponse)
		require.NoError(t, err)

		assert.Equal(t, "Hello in direct chat!", messageResponse.Content)
		assert.Equal(t, directChatID, messageResponse.ChatRoomID)
	})

	t.Run("Get User Chat Rooms", func(t *testing.T) {
		req, _ := http.NewRequest("GET", baseURL+"/api/v1/chatrooms", nil)
		req.Header.Set("Authorization", "Bearer "+user1Token)

		resp, err := testClient.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var response map[string]interface{}
		err = json.NewDecoder(resp.Body).Decode(&response)
		require.NoError(t, err)

		chatRooms, ok := response["chat_rooms"].([]interface{})
		assert.True(t, ok)
		assert.Len(t, chatRooms, 2) // Group chat and direct chat

		// Verify both chat rooms are present
		chatRoomIDs := make([]string, len(chatRooms))
		for i, room := range chatRooms {
			roomData := room.(map[string]interface{})
			chatRoomIDs[i] = roomData["id"].(string)
		}

		assert.Contains(t, chatRoomIDs, groupChatID)
		assert.Contains(t, chatRoomIDs, directChatID)
	})

	t.Run("Search Messages", func(t *testing.T) {
		req, _ := http.NewRequest("GET", baseURL+"/api/v1/chatrooms/"+groupChatID+"/messages/search?q=Hello", nil)
		req.Header.Set("Authorization", "Bearer "+user1Token)

		resp, err := testClient.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var response map[string]interface{}
		err = json.NewDecoder(resp.Body).Decode(&response)
		require.NoError(t, err)

		messages, ok := response["messages"].([]interface{})
		assert.True(t, ok)
		assert.Greater(t, len(messages), 0)
	})

	t.Run("Mark Messages as Read", func(t *testing.T) {
		req, _ := http.NewRequest("PUT", baseURL+"/api/v1/chatrooms/"+groupChatID+"/messages/read", nil)
		req.Header.Set("Authorization", "Bearer "+user2Token)

		resp, err := testClient.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var response map[string]interface{}
		err = json.NewDecoder(resp.Body).Decode(&response)
		require.NoError(t, err)

		assert.Contains(t, response["message"], "marked as read")
	})

	t.Run("Leave Chat Room", func(t *testing.T) {
		req, _ := http.NewRequest("POST", baseURL+"/api/v1/chatrooms/"+groupChatID+"/leave", nil)
		req.Header.Set("Authorization", "Bearer "+user2Token)

		resp, err := testClient.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var response map[string]interface{}
		err = json.NewDecoder(resp.Body).Decode(&response)
		require.NoError(t, err)

		assert.Contains(t, response["message"], "left")
	})

	t.Run("Update Chat Room", func(t *testing.T) {
		updatePayload := map[string]string{
			"name": "Updated Group Chat Name",
		}

		updateBody, _ := json.Marshal(updatePayload)
		req, _ := http.NewRequest("PUT", baseURL+"/api/v1/chatrooms/"+groupChatID, bytes.NewBuffer(updateBody))
		req.Header.Set("Authorization", "Bearer "+user1Token)
		req.Header.Set("Content-Type", "application/json")

		resp, err := testClient.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var response ChatRoomResponse
		err = json.NewDecoder(resp.Body).Decode(&response)
		require.NoError(t, err)

		assert.Equal(t, "Updated Group Chat Name", *response.Name)
	})
}

func TestSearchE2E(t *testing.T) {
	require.NoError(t, cleanupTables())
	require.NoError(t, waitForServer())

	// Create test user
	userToken := createAndLoginUser(t, "searchuser", "search@example.com", "Password123")

	t.Run("Global Search", func(t *testing.T) {
		req, _ := http.NewRequest("GET", baseURL+"/api/v1/search?q=search&type=all", nil)
		req.Header.Set("Authorization", "Bearer "+userToken)

		resp, err := testClient.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var response map[string]interface{}
		err = json.NewDecoder(resp.Body).Decode(&response)
		require.NoError(t, err)

		assert.Equal(t, "search", response["query"])
		assert.Equal(t, "all", response["type"])

		// Should have users section
		users, ok := response["users"].([]interface{})
		assert.True(t, ok)
		assert.Greater(t, len(users), 0)
	})

	t.Run("Search Users Only", func(t *testing.T) {
		req, _ := http.NewRequest("GET", baseURL+"/api/v1/search/users?q=search", nil)
		req.Header.Set("Authorization", "Bearer "+userToken)

		resp, err := testClient.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var response map[string]interface{}
		err = json.NewDecoder(resp.Body).Decode(&response)
		require.NoError(t, err)

		users, ok := response["users"].([]interface{})
		assert.True(t, ok)
		assert.Greater(t, len(users), 0)

		// Verify the search result contains our user
		found := false
		for _, user := range users {
			userData := user.(map[string]interface{})
			if userData["username"] == "searchuser" {
				found = true
				break
			}
		}
		assert.True(t, found)
	})

	t.Run("Search Suggestions", func(t *testing.T) {
		req, _ := http.NewRequest("GET", baseURL+"/api/v1/search/suggestions?q=se", nil)
		req.Header.Set("Authorization", "Bearer "+userToken)

		resp, err := testClient.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var response map[string]interface{}
		err = json.NewDecoder(resp.Body).Decode(&response)
		require.NoError(t, err)

		assert.Equal(t, "se", response["query"])
		
		// Should have users suggestions
		users, ok := response["users"].([]interface{})
		assert.True(t, ok)
		assert.GreaterOrEqual(t, len(users), 0)
	})
}