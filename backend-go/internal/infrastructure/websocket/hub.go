package websocket

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"backend-go/internal/shared/logger"
)

// Hub maintains the set of active clients and broadcasts messages to the clients
type Hub struct {
	// Registered clients
	clients map[*Client]bool

	// Inbound messages from the clients
	broadcast chan []byte

	// Register requests from the clients
	register chan *Client

	// Unregister requests from clients
	unregister chan *Client

	// Room-based messaging
	rooms map[string]map[*Client]bool

	// User to client mapping
	userClients map[string]*Client

	logger logger.Logger
	mu     sync.RWMutex
}

// Client is a middleman between the websocket connection and the hub
type Client struct {
	hub *Hub

	// The websocket connection
	conn *websocket.Conn

	// Buffered channel of outbound messages
	send chan []byte

	// User ID
	userID string

	// Current room ID
	roomID string
}

// Message represents a WebSocket message
type Message struct {
	Type      string      `json:"type"`
	RoomID    string      `json:"room_id,omitempty"`
	SenderID  string      `json:"sender_id,omitempty"`
	Content   string      `json:"content,omitempty"`
	Data      interface{} `json:"data,omitempty"`
	Timestamp time.Time   `json:"timestamp"`
}

const (
	// Time allowed to write a message to the peer
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer
	maxMessageSize = 512
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// Allow connections from any origin in development
		return true
	},
}

// NewHub creates a new WebSocket hub
func NewHub(logger logger.Logger) *Hub {
	return &Hub{
		clients:     make(map[*Client]bool),
		broadcast:   make(chan []byte),
		register:    make(chan *Client),
		unregister:  make(chan *Client),
		rooms:       make(map[string]map[*Client]bool),
		userClients: make(map[string]*Client),
		logger:      logger,
	}
}

// Run starts the hub
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.userClients[client.userID] = client
			h.mu.Unlock()

			h.logger.Info("Client connected", "user_id", client.userID)

			// Send connection confirmation
			message := Message{
				Type:      "connected",
				Timestamp: time.Now(),
			}
			if data, err := json.Marshal(message); err == nil {
				select {
				case client.send <- data:
				default:
					close(client.send)
					h.mu.Lock()
					delete(h.clients, client)
					delete(h.userClients, client.userID)
					h.mu.Unlock()
				}
			}

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				delete(h.userClients, client.userID)
				close(client.send)

				// Remove from room
				if client.roomID != "" {
					if room, exists := h.rooms[client.roomID]; exists {
						delete(room, client)
						if len(room) == 0 {
							delete(h.rooms, client.roomID)
						}
					}
				}
			}
			h.mu.Unlock()

			h.logger.Info("Client disconnected", "user_id", client.userID)

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
					delete(h.userClients, client.userID)
				}
			}
			h.mu.RUnlock()
		}
	}
}

// HandleConnection handles WebSocket connections
func (h *Hub) HandleConnection(w http.ResponseWriter, r *http.Request, userID string) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		h.logger.Error("Failed to upgrade connection", "error", err)
		return
	}

	client := &Client{
		hub:    h,
		conn:   conn,
		send:   make(chan []byte, 256),
		userID: userID,
	}

	client.hub.register <- client

	// Allow collection of memory referenced by the caller by doing all work in new goroutines
	go client.writePump()
	go client.readPump()
}

// JoinRoom adds a client to a room
func (h *Hub) JoinRoom(userID, roomID string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if client, exists := h.userClients[userID]; exists {
		// Leave current room if any
		if client.roomID != "" {
			if room, exists := h.rooms[client.roomID]; exists {
				delete(room, client)
				if len(room) == 0 {
					delete(h.rooms, client.roomID)
				}
			}
		}

		// Join new room
		client.roomID = roomID
		if h.rooms[roomID] == nil {
			h.rooms[roomID] = make(map[*Client]bool)
		}
		h.rooms[roomID][client] = true

		h.logger.Info("Client joined room", "user_id", userID, "room_id", roomID)
	}
}

// LeaveRoom removes a client from a room
func (h *Hub) LeaveRoom(userID, roomID string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if client, exists := h.userClients[userID]; exists && client.roomID == roomID {
		if room, exists := h.rooms[roomID]; exists {
			delete(room, client)
			if len(room) == 0 {
				delete(h.rooms, roomID)
			}
		}
		client.roomID = ""

		h.logger.Info("Client left room", "user_id", userID, "room_id", roomID)
	}
}

// BroadcastToRoom sends a message to all clients in a room
func (h *Hub) BroadcastToRoom(roomID string, message interface{}) {
	h.mu.RLock()
	room, exists := h.rooms[roomID]
	h.mu.RUnlock()

	if !exists {
		return
	}

	data, err := json.Marshal(message)
	if err != nil {
		h.logger.Error("Failed to marshal message", "error", err)
		return
	}

	h.mu.RLock()
	for client := range room {
		select {
		case client.send <- data:
		default:
			close(client.send)
			delete(h.clients, client)
			delete(h.userClients, client.userID)
			delete(room, client)
		}
	}
	h.mu.RUnlock()

	h.logger.Info("Message broadcasted to room", "room_id", roomID, "clients", len(room))
}

// SendToUser sends a message to a specific user
func (h *Hub) SendToUser(userID string, message Message) {
	h.mu.RLock()
	client, exists := h.userClients[userID]
	h.mu.RUnlock()

	if !exists {
		return
	}

	data, err := json.Marshal(message)
	if err != nil {
		h.logger.Error("Failed to marshal message", "error", err)
		return
	}

	select {
	case client.send <- data:
	default:
		h.mu.Lock()
		close(client.send)
		delete(h.clients, client)
		delete(h.userClients, client.userID)
		h.mu.Unlock()
	}

	h.logger.Info("Message sent to user", "user_id", userID)
}

// GetConnectionCount returns the number of active connections
func (h *Hub) GetConnectionCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

// GetRoomCount returns the number of active rooms
func (h *Hub) GetRoomCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.rooms)
}

// Shutdown gracefully shuts down the hub
func (h *Hub) Shutdown() {
	h.mu.Lock()
	defer h.mu.Unlock()

	for client := range h.clients {
		close(client.send)
		client.conn.Close()
	}

	h.logger.Info("WebSocket hub shutdown")
}