package websocket

import (
	"encoding/json"
	"time"

	"github.com/gorilla/websocket"
)

// readPump pumps messages from the websocket connection to the hub
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, messageData, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				c.hub.logger.Error("WebSocket error", "error", err, "user_id", c.userID)
			}
			break
		}

		// Parse incoming message
		var msg Message
		if err := json.Unmarshal(messageData, &msg); err != nil {
			c.hub.logger.Error("Failed to parse message", "error", err, "user_id", c.userID)
			continue
		}

		// Handle different message types
		c.handleMessage(msg)
	}
}

// writePump pumps messages from the hub to the websocket connection
func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The hub closed the channel
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued chat messages to the current websocket message
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// handleMessage processes incoming WebSocket messages
func (c *Client) handleMessage(msg Message) {
	msg.SenderID = c.userID
	msg.Timestamp = time.Now()

	switch msg.Type {
	case "join_room":
		if msg.RoomID != "" {
			c.hub.JoinRoom(c.userID, msg.RoomID)
			
			// Send confirmation
			response := Message{
				Type:      "room_joined",
				RoomID:    msg.RoomID,
				Timestamp: time.Now(),
			}
			if data, err := json.Marshal(response); err == nil {
				select {
				case c.send <- data:
				default:
					close(c.send)
				}
			}
		}

	case "leave_room":
		if msg.RoomID != "" {
			c.hub.LeaveRoom(c.userID, msg.RoomID)
			
			// Send confirmation
			response := Message{
				Type:      "room_left",
				RoomID:    msg.RoomID,
				Timestamp: time.Now(),
			}
			if data, err := json.Marshal(response); err == nil {
				select {
				case c.send <- data:
				default:
					close(c.send)
				}
			}
		}

	case "message":
		if msg.RoomID != "" && c.roomID == msg.RoomID {
			// Broadcast message to room
			c.hub.BroadcastToRoom(msg.RoomID, msg)
		}

	case "typing":
		if msg.RoomID != "" && c.roomID == msg.RoomID {
			// Broadcast typing indicator to room (except sender)
			typingMsg := Message{
				Type:      "typing",
				RoomID:    msg.RoomID,
				SenderID:  c.userID,
				Timestamp: time.Now(),
			}
			c.hub.BroadcastToRoom(msg.RoomID, typingMsg)
		}

	case "ping":
		// Send pong response
		response := Message{
			Type:      "pong",
			Timestamp: time.Now(),
		}
		if data, err := json.Marshal(response); err == nil {
			select {
			case c.send <- data:
			default:
				close(c.send)
			}
		}

	default:
		c.hub.logger.Warn("Unknown message type", "type", msg.Type, "user_id", c.userID)
	}
}