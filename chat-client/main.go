package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/gorilla/websocket"
)

// Message structures
type Message struct {
	ID         string    `json:"id"`
	Content    string    `json:"content"`
	SenderID   string    `json:"senderId"`
	ChatRoomID string    `json:"chatRoomId"`
	Timestamp  time.Time `json:"timestamp"`
	Status     string    `json:"status"`
}

type WebSocketMessage struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

type AuthResponse struct {
	User struct {
		ID       string `json:"id"`
		Username string `json:"username"`
		Email    string `json:"email"`
	} `json:"user"`
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expires_at"`
}

type ChatClient struct {
	conn        *websocket.Conn
	userID      string
	username    string
	token       string
	chatRoomID  string
	isConnected bool
	done        chan struct{}
}

func main() {
	fmt.Println("🚀 WhatsApp Chat Client")
	fmt.Println("========================")

	client := &ChatClient{
		done: make(chan struct{}),
	}

	// Show main menu
	client.showMainMenu()
}

func (c *ChatClient) showMainMenu() {
	for {
		fmt.Println("\n📋 Choose an option:")
		fmt.Println("1. Login")
		fmt.Println("2. Register")
		fmt.Println("3. Exit")
		fmt.Print("Enter your choice (1-3): ")

		choice := c.readInput()
		
		switch choice {
		case "1":
			if c.login() {
				c.showChatMenu()
			}
		case "2":
			c.register()
		case "3":
			fmt.Println("👋 Goodbye!")
			os.Exit(0)
		default:
			fmt.Println("❌ Invalid choice. Please try again.")
		}
	}
}

func (c *ChatClient) showChatMenu() {
	for {
		fmt.Println("\n💬 Chat Options:")
		fmt.Println("1. Connect to WebSocket (Realtime)")
		fmt.Println("2. Send HTTP Message (REST API)")
		fmt.Println("3. View Chat History")
		fmt.Println("4. List Chat Rooms")
		fmt.Println("5. Join Chat Room")
		fmt.Println("6. Create Group")
		fmt.Println("7. Logout")
		fmt.Print("Enter your choice (1-7): ")

		choice := c.readInput()
		
		switch choice {
		case "1":
			c.connectWebSocket()
		case "2":
			c.sendHTTPMessage()
		case "3":
			c.viewChatHistory()
		case "4":
			c.listChatRooms()
		case "5":
			c.joinChatRoom()
		case "6":
			c.createGroup()
		case "7":
			c.logout()
			return
		default:
			fmt.Println("❌ Invalid choice. Please try again.")
		}
	}
}

func (c *ChatClient) login() bool {
	fmt.Print("📧 Email: ")
	email := c.readInput()
	
	fmt.Print("🔒 Password: ")
	password := c.readInput()

	// Create login request
	loginData := map[string]string{
		"email":    email,
		"password": password,
	}

	jsonData, _ := json.Marshal(loginData)
	
	// Send HTTP request
	resp, err := http.Post("http://localhost:8080/api/v1/auth/login", "application/json", strings.NewReader(string(jsonData)))
	if err != nil {
		fmt.Printf("❌ Login failed: %v\n", err)
		return false
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		fmt.Printf("❌ Login failed: Status %d\n", resp.StatusCode)
		return false
	}

	var authResp AuthResponse
	if err := json.NewDecoder(resp.Body).Decode(&authResp); err != nil {
		fmt.Printf("❌ Failed to parse response: %v\n", err)
		return false
	}

	c.userID = authResp.User.ID
	c.username = authResp.User.Username
	c.token = authResp.Token

	fmt.Printf("✅ Login successful! Welcome, %s\n", c.username)
	return true
}

func (c *ChatClient) register() {
	fmt.Print("👤 Username: ")
	username := c.readInput()
	
	fmt.Print("📧 Email: ")
	email := c.readInput()
	
	fmt.Print("🔒 Password: ")
	password := c.readInput()

	// Create register request
	registerData := map[string]string{
		"username": username,
		"email":    email,
		"password": password,
	}

	jsonData, _ := json.Marshal(registerData)
	
	// Send HTTP request
	resp, err := http.Post("http://localhost:8080/api/v1/auth/register", "application/json", strings.NewReader(string(jsonData)))
	if err != nil {
		fmt.Printf("❌ Registration failed: %v\n", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == 201 {
		fmt.Println("✅ Registration successful! Please login.")
	} else {
		fmt.Printf("❌ Registration failed: Status %d\n", resp.StatusCode)
	}
}

func (c *ChatClient) connectWebSocket() {
	if c.isConnected {
		fmt.Println("⚠️ Already connected to WebSocket")
		c.showRealtimeMenu()
		return
	}

	// Connect to WebSocket
	header := http.Header{}
	header.Set("Authorization", "Bearer "+c.token)
	
	// Connect to WebSocket with token as query parameter
	wsURL := fmt.Sprintf("ws://localhost:8080/ws?token=%s", c.token)
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		fmt.Printf("❌ WebSocket connection failed: %v\n", err)
		return
	}

	c.conn = conn
	c.isConnected = true
	
	fmt.Println("🔗 Connected to WebSocket server!")
	
	fmt.Println("🔐 WebSocket connected with JWT token")
	
	// Start listening for messages
	go c.listenForMessages()
	
	// Show realtime menu
	c.showRealtimeMenu()
}

func (c *ChatClient) showRealtimeMenu() {
	fmt.Println("\n⚡ Realtime Chat Mode")
	fmt.Println("Commands:")
	fmt.Println("  /send <message>     - Send message to current chat room")
	fmt.Println("  /join <room_id>     - Join a chat room")
	fmt.Println("  /typing             - Send typing indicator")
	fmt.Println("  /status <message>   - Update status")
	fmt.Println("  /disconnect         - Disconnect from WebSocket")
	fmt.Println("  /help               - Show this help")
	fmt.Println("\nType your commands or messages:")

	// Setup signal handling for graceful shutdown
	interrupt := make(chan os.Signal, 1)
	signal.Notify(interrupt, os.Interrupt, syscall.SIGTERM)

	// Read user input
	scanner := bufio.NewScanner(os.Stdin)
	
	for {
		select {
		case <-interrupt:
			fmt.Println("\n🛑 Disconnecting...")
			c.disconnect()
			return
		default:
			if scanner.Scan() {
				input := strings.TrimSpace(scanner.Text())
				if input == "" {
					continue
				}
				
				if !c.handleRealtimeCommand(input) {
					return // Exit realtime mode
				}
			}
		}
	}
}

func (c *ChatClient) handleRealtimeCommand(input string) bool {
	if strings.HasPrefix(input, "/") {
		parts := strings.SplitN(input, " ", 2)
		command := parts[0]
		
		switch command {
		case "/send":
			if len(parts) < 2 {
				fmt.Println("❌ Usage: /send <message>")
				return true
			}
			c.sendRealtimeMessage(parts[1])
			
		case "/join":
			if len(parts) < 2 {
				fmt.Println("❌ Usage: /join <room_id>")
				return true
			}
			c.joinRealtimeRoom(parts[1])
			
		case "/typing":
			c.sendTypingIndicator()
			
		case "/status":
			if len(parts) < 2 {
				fmt.Println("❌ Usage: /status <message>")
				return true
			}
			c.updateStatus(parts[1])
			
		case "/disconnect":
			c.disconnect()
			return false
			
		case "/help":
			c.showRealtimeMenu()
			
		default:
			fmt.Printf("❌ Unknown command: %s\n", command)
		}
	} else {
		// Send as regular message if in a chat room
		if c.chatRoomID != "" {
			c.sendRealtimeMessage(input)
		} else {
			fmt.Println("⚠️ Join a chat room first using /join <room_id>")
		}
	}
	
	return true
}

func (c *ChatClient) sendRealtimeMessage(content string) {
	if c.chatRoomID == "" {
		fmt.Println("⚠️ Join a chat room first using /join <room_id>")
		return
	}

	// Backend expects Message struct format, not WebSocketMessage wrapper
	message := map[string]interface{}{
		"type":      "message",
		"room_id":   c.chatRoomID,
		"sender_id": c.userID,
		"content":   content,
		"timestamp": time.Now(),
	}

	if err := c.conn.WriteJSON(message); err != nil {
		fmt.Printf("❌ Failed to send message: %v\n", err)
		return
	}

	fmt.Printf("📤 [%s] You: %s\n", time.Now().Format("15:04"), content)
}

func (c *ChatClient) joinRealtimeRoom(roomID string) {
	c.chatRoomID = roomID
	
	// Backend expects Message struct format
	message := map[string]interface{}{
		"type":      "join_room",
		"room_id":   roomID,
		"sender_id": c.userID,
		"timestamp": time.Now(),
	}

	if err := c.conn.WriteJSON(message); err != nil {
		fmt.Printf("❌ Failed to join room: %v\n", err)
		return
	}

	fmt.Printf("🏠 Joining chat room: %s\n", roomID)
}

func (c *ChatClient) sendTypingIndicator() {
	if c.chatRoomID == "" {
		fmt.Println("⚠️ Join a chat room first")
		return
	}

	// Backend expects Message struct format
	message := map[string]interface{}{
		"type":      "typing",
		"room_id":   c.chatRoomID,
		"sender_id": c.userID,
		"timestamp": time.Now(),
	}

	if err := c.conn.WriteJSON(message); err != nil {
		fmt.Printf("❌ Failed to send typing indicator: %v\n", err)
		return
	}

	fmt.Println("⌨️ Typing indicator sent")
}

func (c *ChatClient) updateStatus(status string) {
	// Backend expects Message struct format
	message := map[string]interface{}{
		"type":      "status_update",
		"sender_id": c.userID,
		"content":   status,
		"timestamp": time.Now(),
	}

	if err := c.conn.WriteJSON(message); err != nil {
		fmt.Printf("❌ Failed to update status: %v\n", err)
		return
	}

	fmt.Printf("📊 Status updated: %s\n", status)
}

func (c *ChatClient) listenForMessages() {
	defer func() {
		c.conn.Close()
		c.isConnected = false
	}()

	for {
		var wsMsg WebSocketMessage
		err := c.conn.ReadJSON(&wsMsg)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				fmt.Printf("❌ WebSocket error: %v\n", err)
			}
			break
		}

		c.handleWebSocketMessage(wsMsg)
	}
}

func (c *ChatClient) handleWebSocketMessage(wsMsg WebSocketMessage) {
	switch wsMsg.Type {
	case "connected":
		fmt.Println("✅ Connected to WebSocket server!")
		
	case "room_joined":
		// Backend sends room_id in the message
		if data, ok := wsMsg.Data.(map[string]interface{}); ok {
			if roomId, roomOk := data["room_id"].(string); roomOk {
				fmt.Printf("✅ Successfully joined room: %s\n", roomId)
			}
		} else {
			fmt.Println("✅ Successfully joined room")
		}
		
	case "room_left":
		if data, ok := wsMsg.Data.(map[string]interface{}); ok {
			if roomId, roomOk := data["room_id"].(string); roomOk {
				fmt.Printf("👋 Left room: %s\n", roomId)
			}
		} else {
			fmt.Println("👋 Left room")
		}
		
	case "message":
		// Backend sends message data directly in the WebSocketMessage
		if data, ok := wsMsg.Data.(map[string]interface{}); ok {
			senderID, senderOk := data["sender_id"].(string)
			content, contentOk := data["content"].(string)
			timestampStr, timestampOk := data["timestamp"].(string)
			
			if senderOk && contentOk && senderID != c.userID {
				timestamp := time.Now().Format("15:04")
				if timestampOk {
					if t, err := time.Parse(time.RFC3339, timestampStr); err == nil {
						timestamp = t.Format("15:04")
					}
				}
				fmt.Printf("📥 [%s] %s: %s\n", 
					timestamp, 
					c.getSenderName(senderID), 
					content)
			}
		}
		
	case "typing":
		if data, ok := wsMsg.Data.(map[string]interface{}); ok {
			if senderID, senderOk := data["sender_id"].(string); senderOk && senderID != c.userID {
				fmt.Printf("⌨️ %s is typing...\n", c.getSenderName(senderID))
			}
		}
		
	case "pong":
		// Response to ping - no action needed
		
	case "error":
		if data, ok := wsMsg.Data.(map[string]interface{}); ok {
			if message, msgOk := data["message"].(string); msgOk {
				fmt.Printf("⚠️ Server error: %s\n", message)
			} else {
				fmt.Printf("⚠️ Server error (no details)\n")
			}
		} else {
			fmt.Printf("⚠️ Server error (unknown format)\n")
		}
		
	default:
		fmt.Printf("📨 Received unknown message type: %s\n", wsMsg.Type)
		// Print the raw data for debugging
		if wsMsg.Data != nil {
			if dataBytes, err := json.Marshal(wsMsg.Data); err == nil {
				fmt.Printf("    Data: %s\n", string(dataBytes))
			}
		}
	}
}

func (c *ChatClient) getSenderName(userID string) string {
	// In a real app, you would maintain a user cache
	// For now, just return the user ID
	return fmt.Sprintf("User-%s", userID[:8])
}

func (c *ChatClient) sendHTTPMessage() {
	if c.chatRoomID == "" {
		fmt.Print("🏠 Chat Room ID (or 'auto' for direct chat): ")
		roomInput := c.readInput()
		
		if roomInput == "auto" {
			// Create a direct chat room ID format
			c.chatRoomID = fmt.Sprintf("direct_%s_%s", c.userID, "other_user")
		} else {
			c.chatRoomID = roomInput
		}
	}
	
	fmt.Print("💬 Message: ")
	content := c.readInput()

	messageData := map[string]interface{}{
		"content": content,
	}

	jsonData, _ := json.Marshal(messageData)
	
	// Create HTTP request with authorization - updated to Go backend endpoint
	url := fmt.Sprintf("http://localhost:8080/api/v1/chatrooms/%s/messages", c.chatRoomID)
	req, err := http.NewRequest("POST", url, strings.NewReader(string(jsonData)))
	if err != nil {
		fmt.Printf("❌ Failed to create request: %v\n", err)
		return
	}
	
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.token)
	
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("❌ Failed to send message: %v\n", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == 200 || resp.StatusCode == 201 {
		fmt.Println("✅ Message sent successfully!")
	} else {
		fmt.Printf("❌ Failed to send message. Status: %d\n", resp.StatusCode)
	}
}

func (c *ChatClient) viewChatHistory() {
	if c.chatRoomID == "" {
		fmt.Print("🏠 Chat Room ID: ")
		c.chatRoomID = c.readInput()
	}

	// Create HTTP request with authorization - updated to Go backend endpoint
	url := fmt.Sprintf("http://localhost:8080/api/v1/chatrooms/%s/messages", c.chatRoomID)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		fmt.Printf("❌ Failed to create request: %v\n", err)
		return
	}
	
	req.Header.Set("Authorization", "Bearer "+c.token)
	
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("❌ Failed to get chat history: %v\n", err)
		return
	}
	defer resp.Body.Close()

	// Go backend returns direct array, not wrapped in success/data structure
	var messages []Message

	if err := json.NewDecoder(resp.Body).Decode(&messages); err != nil {
		fmt.Printf("❌ Failed to parse response: %v\n", err)
		return
	}

	fmt.Printf("\n📜 Chat History for Room: %s\n", c.chatRoomID)
	fmt.Println("================================")
	
	if len(messages) == 0 {
		fmt.Println("📭 No messages found in this room")
		return
	}
	
	for _, msg := range messages {
		timestamp := msg.Timestamp.Format("15:04")
		senderName := c.getSenderName(msg.SenderID)
		if msg.SenderID == c.userID {
			senderName = "You"
		}
		fmt.Printf("[%s] %s: %s\n", timestamp, senderName, msg.Content)
	}
}

func (c *ChatClient) listChatRooms() {
	// Create HTTP request with authorization
	req, err := http.NewRequest("GET", "http://localhost:8080/api/v1/chatrooms", nil)
	if err != nil {
		fmt.Printf("❌ Failed to create request: %v\n", err)
		return
	}
	
	req.Header.Set("Authorization", "Bearer "+c.token)
	
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("❌ Failed to get chat rooms: %v\n", err)
		return
	}
	defer resp.Body.Close()

	// Go backend returns direct array
	var chatRooms []struct {
		ID           string    `json:"id"`
		Name         string    `json:"name"`
		Type         string    `json:"type"`
		CreatedAt    time.Time `json:"created_at"`
		UpdatedAt    time.Time `json:"updated_at"`
		Participants []struct {
			ID       string `json:"id"`
			Username string `json:"username"`
		} `json:"participants"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&chatRooms); err != nil {
		fmt.Printf("❌ Failed to parse response: %v\n", err)
		return
	}

	fmt.Println("\n🏠 Available Chat Rooms:")
	fmt.Println("========================")
	
	if len(chatRooms) == 0 {
		fmt.Println("📭 No chat rooms found")
		return
	}
	
	for i, room := range chatRooms {
		fmt.Printf("%d. %s (ID: %s)\n", i+1, room.Name, room.ID)
		fmt.Printf("   Type: %s | Participants: %d\n", room.Type, len(room.Participants))
		fmt.Printf("   Created: %s\n", room.CreatedAt.Format("2006-01-02 15:04"))
		fmt.Println()
	}
}

func (c *ChatClient) joinChatRoom() {
	fmt.Print("🏠 Enter Chat Room ID: ")
	roomID := c.readInput()
	
	// Try to join the room via API
	joinData := map[string]interface{}{}
	jsonData, _ := json.Marshal(joinData)
	
	url := fmt.Sprintf("http://localhost:8080/api/v1/chatrooms/%s/join", roomID)
	req, err := http.NewRequest("POST", url, strings.NewReader(string(jsonData)))
	if err != nil {
		fmt.Printf("❌ Failed to create request: %v\n", err)
		return
	}
	
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.token)
	
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("❌ Failed to join room: %v\n", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == 200 || resp.StatusCode == 201 {
		c.chatRoomID = roomID
		fmt.Printf("✅ Joined chat room: %s\n", roomID)
	} else {
		fmt.Printf("❌ Failed to join room. Status: %d\n", resp.StatusCode)
	}
}

func (c *ChatClient) createGroup() {
	fmt.Print("👥 Group Name: ")
	groupName := c.readInput()
	
	fmt.Print("👤 Participant User IDs (comma-separated): ")
	participantsInput := c.readInput()
	
	participantIDs := strings.Split(participantsInput, ",")
	for i, p := range participantIDs {
		participantIDs[i] = strings.TrimSpace(p)
	}

	groupData := map[string]interface{}{
		"name":         groupName,
		"participants": participantIDs,
		"type":         "group",
	}

	jsonData, _ := json.Marshal(groupData)
	
	// Create HTTP request with authorization - updated to Go backend endpoint
	req, err := http.NewRequest("POST", "http://localhost:8080/api/v1/chatrooms", strings.NewReader(string(jsonData)))
	if err != nil {
		fmt.Printf("❌ Failed to create request: %v\n", err)
		return
	}
	
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.token)
	
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("❌ Failed to create group: %v\n", err)
		return
	}
	defer resp.Body.Close()

	// Go backend returns direct response, not wrapped in success/data structure
	var chatRoom struct {
		ID   string `json:"id"`
		Name string `json:"name"`
		Type string `json:"type"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&chatRoom); err != nil {
		fmt.Printf("❌ Failed to parse response: %v\n", err)
		return
	}

	if resp.StatusCode == 200 || resp.StatusCode == 201 {
		fmt.Printf("✅ Group '%s' created successfully!\n", groupName)
		fmt.Printf("🆔 Group ID: %s\n", chatRoom.ID)
		c.chatRoomID = chatRoom.ID
	} else {
		fmt.Printf("❌ Failed to create group. Status: %d\n", resp.StatusCode)
	}
}

func (c *ChatClient) disconnect() {
	if c.conn != nil {
		c.conn.Close()
	}
	c.isConnected = false
	fmt.Println("🔌 Disconnected from WebSocket")
}

func (c *ChatClient) logout() {
	c.disconnect()
	c.userID = ""
	c.username = ""
	c.token = ""
	c.chatRoomID = ""
	fmt.Println("👋 Logged out successfully!")
}

func (c *ChatClient) readInput() string {
	reader := bufio.NewReader(os.Stdin)
	input, _ := reader.ReadString('\n')
	return strings.TrimSpace(input)
}