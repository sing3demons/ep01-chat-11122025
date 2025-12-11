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
	Success bool `json:"success"`
	Data    struct {
		User struct {
			ID       string `json:"id"`
			Username string `json:"username"`
			Email    string `json:"email"`
		} `json:"user"`
		Token string `json:"token"`
	} `json:"data"`
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
		fmt.Println("4. Join Chat Room")
		fmt.Println("5. Create Group")
		fmt.Println("6. Logout")
		fmt.Print("Enter your choice (1-6): ")

		choice := c.readInput()
		
		switch choice {
		case "1":
			c.connectWebSocket()
		case "2":
			c.sendHTTPMessage()
		case "3":
			c.viewChatHistory()
		case "4":
			c.joinChatRoom()
		case "5":
			c.createGroup()
		case "6":
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
	resp, err := http.Post("http://localhost:3001/api/auth/login", "application/json", strings.NewReader(string(jsonData)))
	if err != nil {
		fmt.Printf("❌ Login failed: %v\n", err)
		return false
	}
	defer resp.Body.Close()

	var authResp AuthResponse
	if err := json.NewDecoder(resp.Body).Decode(&authResp); err != nil {
		fmt.Printf("❌ Failed to parse response: %v\n", err)
		return false
	}

	if !authResp.Success {
		fmt.Println("❌ Login failed: Invalid credentials")
		return false
	}

	c.userID = authResp.Data.User.ID
	c.username = authResp.Data.User.Username
	c.token = authResp.Data.Token

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
	resp, err := http.Post("http://localhost:3001/api/auth/register", "application/json", strings.NewReader(string(jsonData)))
	if err != nil {
		fmt.Printf("❌ Registration failed: %v\n", err)
		return
	}
	defer resp.Body.Close()

	var authResp AuthResponse
	if err := json.NewDecoder(resp.Body).Decode(&authResp); err != nil {
		fmt.Printf("❌ Failed to parse response: %v\n", err)
		return
	}

	if authResp.Success {
		fmt.Println("✅ Registration successful! Please login.")
	} else {
		fmt.Println("❌ Registration failed")
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
	
	conn, _, err := websocket.DefaultDialer.Dial("ws://localhost:3001", header)
	if err != nil {
		fmt.Printf("❌ WebSocket connection failed: %v\n", err)
		return
	}

	c.conn = conn
	c.isConnected = true
	
	fmt.Println("🔗 Connected to WebSocket server!")
	
	// Send authentication message
	authMsg := WebSocketMessage{
		Type: "authenticate",
		Data: map[string]interface{}{
			"token":  c.token,
			"userId": c.userID,
		},
	}
	
	if err := c.conn.WriteJSON(authMsg); err != nil {
		fmt.Printf("❌ Failed to authenticate: %v\n", err)
		c.conn.Close()
		c.isConnected = false
		return
	}
	
	fmt.Println("🔐 Authentication sent...")
	
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

	message := WebSocketMessage{
		Type: "message",
		Data: map[string]interface{}{
			"content":    content,
			"chatRoomId": c.chatRoomID,
			"senderId":   c.userID,
		},
	}

	if err := c.conn.WriteJSON(message); err != nil {
		fmt.Printf("❌ Failed to send message: %v\n", err)
		return
	}

	fmt.Printf("📤 [%s] You: %s\n", time.Now().Format("15:04"), content)
}

func (c *ChatClient) joinRealtimeRoom(roomID string) {
	c.chatRoomID = roomID
	
	message := WebSocketMessage{
		Type: "join_room",
		Data: map[string]interface{}{
			"chatRoomId": roomID,
			"userId":     c.userID,
		},
	}

	if err := c.conn.WriteJSON(message); err != nil {
		fmt.Printf("❌ Failed to join room: %v\n", err)
		return
	}

	fmt.Printf("🏠 Joined chat room: %s\n", roomID)
}

func (c *ChatClient) sendTypingIndicator() {
	if c.chatRoomID == "" {
		fmt.Println("⚠️ Join a chat room first")
		return
	}

	message := WebSocketMessage{
		Type: "typing_start",
		Data: map[string]interface{}{
			"chatRoomId": c.chatRoomID,
			"userId":     c.userID,
		},
	}

	if err := c.conn.WriteJSON(message); err != nil {
		fmt.Printf("❌ Failed to send typing indicator: %v\n", err)
		return
	}

	fmt.Println("⌨️ Typing indicator sent")
}

func (c *ChatClient) updateStatus(status string) {
	message := WebSocketMessage{
		Type: "status_update",
		Data: map[string]interface{}{
			"userId": c.userID,
			"status": status,
		},
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
	case "connection_ack":
		fmt.Println("📨 Received: connection_ack")
		
	case "authenticated", "auth_success":
		fmt.Println("✅ Authentication successful!")
		
	case "authentication_failed", "auth_failed":
		fmt.Println("❌ Authentication failed!")
		c.disconnect()
		
	case "room_joined":
		if data, ok := wsMsg.Data.(map[string]interface{}); ok {
			if roomId, roomOk := data["chatRoomId"].(string); roomOk {
				fmt.Printf("✅ Successfully joined room: %s\n", roomId)
			}
		}
		
	case "message_sent":
		// Message sent confirmation - already handled by local echo
		
	case "message":
		if data, ok := wsMsg.Data.(map[string]interface{}); ok {
			senderID, senderOk := data["senderId"].(string)
			content, contentOk := data["content"].(string)
			timestamp, timestampOk := data["timestamp"].(string)
			
			if senderOk && contentOk && timestampOk && senderID != c.userID {
				fmt.Printf("📥 [%s] %s: %s\n", 
					timestamp, 
					c.getSenderName(senderID), 
					content)
			}
		}
		
	case "typing_start":
		if data, ok := wsMsg.Data.(map[string]interface{}); ok {
			if userID, userOk := data["userId"].(string); userOk && userID != c.userID {
				fmt.Printf("⌨️ %s is typing...\n", c.getSenderName(userID))
			}
		}
		
	case "user_status":
		if data, ok := wsMsg.Data.(map[string]interface{}); ok {
			if userID, userOk := data["userId"].(string); userOk {
				if isOnline, onlineOk := data["isOnline"].(bool); onlineOk {
					status := "offline"
					if isOnline {
						status = "online"
					}
					fmt.Printf("👤 %s is now %s\n", c.getSenderName(userID), status)
				}
			}
		}
		
	case "notification":
		if data, ok := wsMsg.Data.(map[string]interface{}); ok {
			if title, titleOk := data["title"].(string); titleOk {
				if content, contentOk := data["content"].(string); contentOk {
					fmt.Printf("🔔 %s: %s\n", title, content)
				}
			}
		}
		
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
		fmt.Printf("📨 Received: %s\n", wsMsg.Type)
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
		"content":    content,
		"chatRoomId": c.chatRoomID,
	}

	jsonData, _ := json.Marshal(messageData)
	
	// Create HTTP request with authorization
	req, err := http.NewRequest("POST", "http://localhost:3001/api/messages", strings.NewReader(string(jsonData)))
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

	// Create HTTP request with authorization
	req, err := http.NewRequest("GET", fmt.Sprintf("http://localhost:3001/api/messages?chatRoomId=%s", c.chatRoomID), nil)
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

	var response struct {
		Success bool      `json:"success"`
		Data    []Message `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		fmt.Printf("❌ Failed to parse response: %v\n", err)
		return
	}

	if !response.Success {
		fmt.Println("❌ Failed to get chat history")
		return
	}

	fmt.Printf("\n📜 Chat History for Room: %s\n", c.chatRoomID)
	fmt.Println("================================")
	
	for _, msg := range response.Data {
		timestamp := msg.Timestamp.Format("15:04")
		senderName := c.getSenderName(msg.SenderID)
		if msg.SenderID == c.userID {
			senderName = "You"
		}
		fmt.Printf("[%s] %s: %s\n", timestamp, senderName, msg.Content)
	}
}

func (c *ChatClient) joinChatRoom() {
	fmt.Print("🏠 Enter Chat Room ID: ")
	roomID := c.readInput()
	c.chatRoomID = roomID
	fmt.Printf("✅ Joined chat room: %s\n", roomID)
}

func (c *ChatClient) createGroup() {
	fmt.Print("👥 Group Name: ")
	groupName := c.readInput()
	
	fmt.Print("👤 Participant Emails (comma-separated): ")
	participantsInput := c.readInput()
	
	participantEmails := strings.Split(participantsInput, ",")
	for i, p := range participantEmails {
		participantEmails[i] = strings.TrimSpace(p)
	}

	groupData := map[string]interface{}{
		"name":         groupName,
		"participants": participantEmails,
		"type":         "group",
	}

	jsonData, _ := json.Marshal(groupData)
	
	// Create HTTP request with authorization
	req, err := http.NewRequest("POST", "http://localhost:3001/api/chatrooms", strings.NewReader(string(jsonData)))
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

	var response struct {
		Success bool `json:"success"`
		Data    struct {
			ID string `json:"id"`
		} `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		fmt.Printf("❌ Failed to parse response: %v\n", err)
		return
	}

	if response.Success {
		fmt.Printf("✅ Group '%s' created successfully!\n", groupName)
		fmt.Printf("🆔 Group ID: %s\n", response.Data.ID)
		c.chatRoomID = response.Data.ID
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