package e2e

import (
	"encoding/json"
	"fmt"
	"net/url"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type WSMessage struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

func TestWebSocketE2E(t *testing.T) {
	require.NoError(t, cleanupTables())
	require.NoError(t, waitForServer())

	// Create two users for testing
	user1Token := createAndLoginUser(t, "wsuser1", "ws1@example.com", "Password123")
	user2Token := createAndLoginUser(t, "wsuser2", "ws2@example.com", "Password123")

	t.Run("WebSocket Connection and Basic Communication", func(t *testing.T) {
		// Connect user1
		wsURL1 := url.URL{Scheme: "ws", Host: "localhost:8081", Path: "/ws", RawQuery: "token=" + user1Token}
		conn1, _, err := websocket.DefaultDialer.Dial(wsURL1.String(), nil)
		require.NoError(t, err)
		defer conn1.Close()

		// Connect user2
		wsURL2 := url.URL{Scheme: "ws", Host: "localhost:8081", Path: "/ws", RawQuery: "token=" + user2Token}
		conn2, _, err := websocket.DefaultDialer.Dial(wsURL2.String(), nil)
		require.NoError(t, err)
		defer conn2.Close()

		// Wait for connection establishment
		time.Sleep(100 * time.Millisecond)

		// Read welcome messages
		var welcomeMsg1, welcomeMsg2 map[string]interface{}
		
		err = conn1.ReadJSON(&welcomeMsg1)
		require.NoError(t, err)
		assert.Equal(t, "connection_established", welcomeMsg1["type"])

		err = conn2.ReadJSON(&welcomeMsg2)
		require.NoError(t, err)
		assert.Equal(t, "connection_established", welcomeMsg2["type"])

		// Test ping-pong
		pingMsg := WSMessage{
			Type:    "ping",
			Payload: nil,
		}

		err = conn1.WriteJSON(pingMsg)
		require.NoError(t, err)

		var pongResponse map[string]interface{}
		err = conn1.ReadJSON(&pongResponse)
		require.NoError(t, err)
		assert.Equal(t, "pong", pongResponse["type"])
	})

	t.Run("Room-based Messaging", func(t *testing.T) {
		// Connect both users
		wsURL1 := url.URL{Scheme: "ws", Host: "localhost:8081", Path: "/ws", RawQuery: "token=" + user1Token}
		conn1, _, err := websocket.DefaultDialer.Dial(wsURL1.String(), nil)
		require.NoError(t, err)
		defer conn1.Close()

		wsURL2 := url.URL{Scheme: "ws", Host: "localhost:8081", Path: "/ws", RawQuery: "token=" + user2Token}
		conn2, _, err := websocket.DefaultDialer.Dial(wsURL2.String(), nil)
		require.NoError(t, err)
		defer conn2.Close()

		// Clear welcome messages
		time.Sleep(100 * time.Millisecond)
		clearMessages(conn1)
		clearMessages(conn2)

		// Create a test room ID (in real scenario, this would come from chat room creation)
		testRoomID := "test-room-123"

		// User1 joins room
		joinMsg1 := WSMessage{
			Type: "join_room",
			Payload: map[string]interface{}{
				"room_id": testRoomID,
			},
		}

		err = conn1.WriteJSON(joinMsg1)
		require.NoError(t, err)

		// Read join confirmation for user1
		var joinResponse1 map[string]interface{}
		err = conn1.ReadJSON(&joinResponse1)
		require.NoError(t, err)
		assert.Equal(t, "room_joined", joinResponse1["type"])

		// User2 joins room
		joinMsg2 := WSMessage{
			Type: "join_room",
			Payload: map[string]interface{}{
				"room_id": testRoomID,
			},
		}

		err = conn2.WriteJSON(joinMsg2)
		require.NoError(t, err)

		// Read join confirmation for user2
		var joinResponse2 map[string]interface{}
		err = conn2.ReadJSON(&joinResponse2)
		require.NoError(t, err)
		assert.Equal(t, "room_joined", joinResponse2["type"])

		// User1 should receive notification that user2 joined
		var userJoinedNotification map[string]interface{}
		err = conn1.ReadJSON(&userJoinedNotification)
		require.NoError(t, err)
		assert.Equal(t, "user_joined", userJoinedNotification["type"])

		// User1 sends a message
		sendMsg := WSMessage{
			Type: "send_message",
			Payload: map[string]interface{}{
				"room_id": testRoomID,
				"content": "Hello from WebSocket!",
			},
		}

		err = conn1.WriteJSON(sendMsg)
		require.NoError(t, err)

		// User1 should receive send confirmation
		var sendConfirmation map[string]interface{}
		err = conn1.ReadJSON(&sendConfirmation)
		require.NoError(t, err)
		assert.Equal(t, "message_sent", sendConfirmation["type"])

		// User2 should receive the message
		var receivedMessage map[string]interface{}
		err = conn2.ReadJSON(&receivedMessage)
		require.NoError(t, err)
		assert.Equal(t, "message_received", receivedMessage["type"])

		data := receivedMessage["data"].(map[string]interface{})
		assert.Equal(t, "Hello from WebSocket!", data["content"])
		assert.Equal(t, testRoomID, data["room_id"])
	})

	t.Run("Typing Indicators", func(t *testing.T) {
		// Connect both users
		wsURL1 := url.URL{Scheme: "ws", Host: "localhost:8081", Path: "/ws", RawQuery: "token=" + user1Token}
		conn1, _, err := websocket.DefaultDialer.Dial(wsURL1.String(), nil)
		require.NoError(t, err)
		defer conn1.Close()

		wsURL2 := url.URL{Scheme: "ws", Host: "localhost:8081", Path: "/ws", RawQuery: "token=" + user2Token}
		conn2, _, err := websocket.DefaultDialer.Dial(wsURL2.String(), nil)
		require.NoError(t, err)
		defer conn2.Close()

		// Clear welcome messages
		time.Sleep(100 * time.Millisecond)
		clearMessages(conn1)
		clearMessages(conn2)

		testRoomID := "typing-test-room"

		// Both users join room
		joinMsg := WSMessage{
			Type: "join_room",
			Payload: map[string]interface{}{
				"room_id": testRoomID,
			},
		}

		err = conn1.WriteJSON(joinMsg)
		require.NoError(t, err)
		err = conn2.WriteJSON(joinMsg)
		require.NoError(t, err)

		// Clear join messages
		time.Sleep(100 * time.Millisecond)
		clearMessages(conn1)
		clearMessages(conn2)

		// User1 starts typing
		typingStartMsg := WSMessage{
			Type: "typing_start",
			Payload: map[string]interface{}{
				"room_id": testRoomID,
			},
		}

		err = conn1.WriteJSON(typingStartMsg)
		require.NoError(t, err)

		// User2 should receive typing indicator
		var typingNotification map[string]interface{}
		err = conn2.ReadJSON(&typingNotification)
		require.NoError(t, err)
		assert.Equal(t, "typing_start", typingNotification["type"])

		data := typingNotification["data"].(map[string]interface{})
		assert.Equal(t, testRoomID, data["room_id"])

		// User1 stops typing
		typingStopMsg := WSMessage{
			Type: "typing_stop",
			Payload: map[string]interface{}{
				"room_id": testRoomID,
			},
		}

		err = conn1.WriteJSON(typingStopMsg)
		require.NoError(t, err)

		// User2 should receive typing stop indicator
		var typingStopNotification map[string]interface{}
		err = conn2.ReadJSON(&typingStopNotification)
		require.NoError(t, err)
		assert.Equal(t, "typing_stop", typingStopNotification["type"])
	})

	t.Run("Invalid WebSocket Messages", func(t *testing.T) {
		// Connect user
		wsURL := url.URL{Scheme: "ws", Host: "localhost:8081", Path: "/ws", RawQuery: "token=" + user1Token}
		conn, _, err := websocket.DefaultDialer.Dial(wsURL.String(), nil)
		require.NoError(t, err)
		defer conn.Close()

		// Clear welcome message
		time.Sleep(100 * time.Millisecond)
		clearMessages(conn)

		// Send invalid message type
		invalidMsg := WSMessage{
			Type:    "invalid_type",
			Payload: nil,
		}

		err = conn.WriteJSON(invalidMsg)
		require.NoError(t, err)

		// Should not receive any response for invalid message type
		// (The server logs a warning but doesn't send error back)

		// Send join_room with invalid payload
		invalidJoinMsg := WSMessage{
			Type:    "join_room",
			Payload: "invalid_payload",
		}

		err = conn.WriteJSON(invalidJoinMsg)
		require.NoError(t, err)

		// Should receive error message
		var errorResponse map[string]interface{}
		err = conn.ReadJSON(&errorResponse)
		require.NoError(t, err)
		assert.Equal(t, "error", errorResponse["type"])

		payload := errorResponse["payload"].(map[string]interface{})
		assert.Contains(t, payload["message"], "invalid")
	})

	t.Run("Unauthorized WebSocket Connection", func(t *testing.T) {
		// Try to connect without token
		wsURL := url.URL{Scheme: "ws", Host: "localhost:8081", Path: "/ws"}
		_, resp, err := websocket.DefaultDialer.Dial(wsURL.String(), nil)
		
		// Should fail to connect
		assert.Error(t, err)
		if resp != nil {
			assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
		}

		// Try to connect with invalid token
		wsURL = url.URL{Scheme: "ws", Host: "localhost:8081", Path: "/ws", RawQuery: "token=invalid-token"}
		_, resp, err = websocket.DefaultDialer.Dial(wsURL.String(), nil)
		
		// Should fail to connect
		assert.Error(t, err)
		if resp != nil {
			assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
		}
	})
}

// Helper function to clear pending messages from WebSocket connection
func clearMessages(conn *websocket.Conn) {
	conn.SetReadDeadline(time.Now().Add(50 * time.Millisecond))
	for {
		var msg map[string]interface{}
		err := conn.ReadJSON(&msg)
		if err != nil {
			break
		}
	}
	conn.SetReadDeadline(time.Time{}) // Reset deadline
}