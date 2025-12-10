package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gorilla/websocket"
)

// API Response structures
type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
	Message string      `json:"message,omitempty"`
}

type AuthResponse struct {
	User  User   `json:"user"`
	Token string `json:"token"`
}

type User struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
}

type Message struct {
	ID         string    `json:"id"`
	Content    string    `json:"content"`
	SenderID   string    `json:"senderId"`
	ChatRoomID string    `json:"chatRoomId"`
	Timestamp  time.Time `json:"timestamp"`
	Status     string    `json:"status"`
}

type ChatRoom struct {
	ID            string    `json:"id"`
	Name          string    `json:"name,omitempty"`
	Type          string    `json:"type"`
	Participants  []string  `json:"participants"`
	CreatedAt     time.Time `json:"createdAt"`
	LastMessageAt time.Time `json:"lastMessageAt"`
}

// WebSocket message types
type WSMessage struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

type ChatClient struct {
	baseURL    string
	token      string
	user       User
	httpClient *http.Client
	wsConn     *websocket.Conn
	currentRoom string
}

func NewChatClient(baseURL string) *ChatClient {
	return &ChatClient{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (c *ChatClient) makeRequest(method, endpoint string, body interface{}) (*APIResponse, error) {
	var reqBody io.Reader
	if body != nil {
		jsonData, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		reqBody = bytes.NewBuffer(jsonData)
	}

	req, err := http.NewRequest(method, c.baseURL+endpoint, reqBody)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	if c.token != "" {
		req.Header.Set("Authorization", "Bearer "+c.token)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var apiResp APIResponse
	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		return nil, err
	}

	return &apiResp, nil
}

func (c *ChatClient) register(username, email, password string) error {
	body := map[string]string{
		"username": username,
		"email":    email,
		"password": password,
	}

	resp, err := c.makeRequest("POST", "/api/auth/register", body)
	if err != nil {
		return err
	}

	if !resp.Success {
		return fmt.Errorf("registration failed: %s", resp.Error)
	}

	fmt.Println("✅ Registration successful!")
	return nil
}

func (c *ChatClient) login(email, password string) error {
	body := map[string]string{
		"email":    email,
		"password": password,
	}

	resp, err := c.makeRequest("POST", "/api/auth/login", body)
	if err != nil {
		return err
	}

	if !resp.Success {
		return fmt.Errorf("login failed: %s", resp.Error)
	}

	// Parse auth response
	authData, _ := json.Marshal(resp.Data)
	var authResp AuthResponse
	if err := json.Unmarshal(authData, &authResp); err != nil {
		return err
	}

	c.token = authResp.Token
	c.user = authResp.User

	fmt.Printf("✅ Welcome, %s!\n", c.user.Username)
	return nil
}

func (c *ChatClient) getChatRooms() ([]ChatRoom, error) {
	resp, err := c.makeRequest("GET", "/api/chatrooms", nil)
	if err != nil {
		return nil, err
	}

	if !resp.Success {
		return nil, fmt.Errorf("failed to get chat rooms: %s", resp.Error)
	}

	var rooms []ChatRoom
	roomData, _ := json.Marshal(resp.Data)
	if err := json.Unmarshal(roomData, &rooms); err != nil {
		return nil, err
	}

	return rooms, nil
}

func (c *ChatClient) createChatRoom(name, roomType string, participants []string) (*ChatRoom, error) {
	body := map[string]interface{}{
		"name":         name,
		"type":         roomType,
		"participants": participants,
	}

	resp, err := c.makeRequest("POST", "/api/chatrooms", body)
	if err != nil {
		return nil, err
	}

	if !resp.Success {
		return nil, fmt.Errorf("failed to create chat room: %s", resp.Error)
	}

	var room ChatRoom
	roomData, _ := json.Marshal(resp.Data)
	if err := json.Unmarshal(roomData, &room); err != nil {
		return nil, err
	}

	return &room, nil
}

func (c *ChatClient) sendMessage(chatRoomID, content string) error {
	body := map[string]string{
		"chatRoomId": chatRoomID,
		"content":    content,
	}

	resp, err := c.makeRequest("POST", "/api/messages", body)
	if err != nil {
		return err
	}

	if !resp.Success {
		return fmt.Errorf("failed to send message: %s", resp.Error)
	}

	return nil
}

func (c *ChatClient) getMessages(chatRoomID string) ([]Message, error) {
	resp, err := c.makeRequest("GET", "/api/messages/"+chatRoomID, nil)
	if err != nil {
		return nil, err
	}

	if !resp.Success {
		return nil, fmt.Errorf("failed to get messages: %s", resp.Error)
	}

	var messages []Message
	msgData, _ := json.Marshal(resp.Data)
	if err := json.Unmarshal(msgData, &messages); err != nil {
		return nil, err
	}

	return messages, nil
}

func (c *ChatClient) connectWebSocket() error {
	wsURL := strings.Replace(c.baseURL, "http", "ws", 1) + "/ws?token=" + c.token
	
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		return err
	}

	c.wsConn = conn
	
	// Start listening for WebSocket messages
	go c.listenWebSocket()
	
	return nil
}

func (c *ChatClient) listenWebSocket() {
	defer c.wsConn.Close()
	
	for {
		var msg WSMessage
		err := c.wsConn.ReadJSON(&msg)
		if err != nil {
			log.Printf("WebSocket read error: %v", err)
			return
		}
		
		c.handleWebSocketMessage(msg)
	}
}

func (c *ChatClient) handleWebSocketMessage(msg WSMessage) {
	switch msg.Type {
	case "message":
		msgData, _ := json.Marshal(msg.Data)
		var message Message
		if err := json.Unmarshal(msgData, &message); err == nil {
			if message.ChatRoomID == c.currentRoom && message.SenderID != c.user.ID {
				fmt.Printf("\n💬 New message: %s\n> ", message.Content)
			}
		}
	case "typing":
		if c.currentRoom != "" {
			fmt.Printf("\n⌨️  Someone is typing...\n> ")
		}
	}
}

func (c *ChatClient) showMenu() {
	fmt.Println("\n=== WhatsApp Chat Client ===")
	fmt.Println("1. List chat rooms")
	fmt.Println("2. Create new chat room")
	fmt.Println("3. Join chat room")
	fmt.Println("4. Send message")
	fmt.Println("5. View messages")
	fmt.Println("6. Exit")
	fmt.Print("Choose option: ")
}

func (c *ChatClient) run() {
	scanner := bufio.NewScanner(os.Stdin)

	// Authentication
	for {
		fmt.Println("\n=== Authentication ===")
		fmt.Println("1. Login")
		fmt.Println("2. Register")
		fmt.Print("Choose option: ")
		
		if !scanner.Scan() {
			return
		}
		
		choice := strings.TrimSpace(scanner.Text())
		
		switch choice {
		case "1":
			fmt.Print("Email: ")
			scanner.Scan()
			email := strings.TrimSpace(scanner.Text())
			
			fmt.Print("Password: ")
			scanner.Scan()
			password := strings.TrimSpace(scanner.Text())
			
			if err := c.login(email, password); err != nil {
				fmt.Printf("❌ %v\n", err)
				continue
			}
			goto mainMenu
			
		case "2":
			fmt.Print("Username: ")
			scanner.Scan()
			username := strings.TrimSpace(scanner.Text())
			
			fmt.Print("Email: ")
			scanner.Scan()
			email := strings.TrimSpace(scanner.Text())
			
			fmt.Print("Password: ")
			scanner.Scan()
			password := strings.TrimSpace(scanner.Text())
			
			if err := c.register(username, email, password); err != nil {
				fmt.Printf("❌ %v\n", err)
				continue
			}
			
		default:
			fmt.Println("❌ Invalid option")
		}
	}

mainMenu:
	// Connect WebSocket
	if err := c.connectWebSocket(); err != nil {
		fmt.Printf("⚠️  WebSocket connection failed: %v\n", err)
	} else {
		fmt.Println("🔌 Connected to real-time chat!")
	}

	// Main menu loop
	for {
		c.showMenu()
		
		if !scanner.Scan() {
			return
		}
		
		choice := strings.TrimSpace(scanner.Text())
		
		switch choice {
		case "1":
			c.listChatRooms()
		case "2":
			c.createNewChatRoom(scanner)
		case "3":
			c.joinChatRoom(scanner)
		case "4":
			c.sendMessageInteractive(scanner)
		case "5":
			c.viewMessages()
		case "6":
			fmt.Println("👋 Goodbye!")
			return
		default:
			fmt.Println("❌ Invalid option")
		}
	}
}

func (c *ChatClient) listChatRooms() {
	rooms, err := c.getChatRooms()
	if err != nil {
		fmt.Printf("❌ %v\n", err)
		return
	}

	if len(rooms) == 0 {
		fmt.Println("📭 No chat rooms found")
		return
	}

	fmt.Println("\n📋 Your Chat Rooms:")
	for i, room := range rooms {
		roomName := room.Name
		if roomName == "" {
			roomName = fmt.Sprintf("Room %s", room.ID[:8])
		}
		fmt.Printf("%d. %s (%s) - %d participants\n", 
			i+1, roomName, room.Type, len(room.Participants))
	}
}

func (c *ChatClient) createNewChatRoom(scanner *bufio.Scanner) {
	fmt.Print("Room name (optional): ")
	scanner.Scan()
	name := strings.TrimSpace(scanner.Text())

	fmt.Print("Room type (direct/group): ")
	scanner.Scan()
	roomType := strings.TrimSpace(scanner.Text())

	if roomType != "direct" && roomType != "group" {
		fmt.Println("❌ Invalid room type")
		return
	}

	fmt.Print("Participant emails (comma-separated): ")
	scanner.Scan()
	participantInput := strings.TrimSpace(scanner.Text())
	
	participants := []string{}
	if participantInput != "" {
		participants = strings.Split(participantInput, ",")
		for i, p := range participants {
			participants[i] = strings.TrimSpace(p)
		}
	}

	room, err := c.createChatRoom(name, roomType, participants)
	if err != nil {
		fmt.Printf("❌ %v\n", err)
		return
	}

	fmt.Printf("✅ Chat room created: %s (ID: %s)\n", room.Name, room.ID)
}

func (c *ChatClient) joinChatRoom(scanner *bufio.Scanner) {
	rooms, err := c.getChatRooms()
	if err != nil {
		fmt.Printf("❌ %v\n", err)
		return
	}

	if len(rooms) == 0 {
		fmt.Println("📭 No chat rooms available")
		return
	}

	c.listChatRooms()
	fmt.Print("Enter room number to join: ")
	scanner.Scan()
	choice := strings.TrimSpace(scanner.Text())

	roomIndex := 0
	if _, err := fmt.Sscanf(choice, "%d", &roomIndex); err != nil || roomIndex < 1 || roomIndex > len(rooms) {
		fmt.Println("❌ Invalid room number")
		return
	}

	selectedRoom := rooms[roomIndex-1]
	c.currentRoom = selectedRoom.ID
	
	roomName := selectedRoom.Name
	if roomName == "" {
		roomName = fmt.Sprintf("Room %s", selectedRoom.ID[:8])
	}
	
	fmt.Printf("🏠 Joined room: %s\n", roomName)
	fmt.Println("💡 You can now send messages using option 4")
}

func (c *ChatClient) sendMessageInteractive(scanner *bufio.Scanner) {
	if c.currentRoom == "" {
		fmt.Println("❌ Please join a chat room first")
		return
	}

	fmt.Print("Enter message (or 'exit' to stop): ")
	
	for {
		scanner.Scan()
		message := strings.TrimSpace(scanner.Text())
		
		if message == "exit" {
			break
		}
		
		if message == "" {
			fmt.Print("> ")
			continue
		}

		if err := c.sendMessage(c.currentRoom, message); err != nil {
			fmt.Printf("❌ Failed to send: %v\n", err)
		} else {
			fmt.Printf("✅ Sent: %s\n", message)
		}
		
		fmt.Print("> ")
	}
}

func (c *ChatClient) viewMessages() {
	if c.currentRoom == "" {
		fmt.Println("❌ Please join a chat room first")
		return
	}

	messages, err := c.getMessages(c.currentRoom)
	if err != nil {
		fmt.Printf("❌ %v\n", err)
		return
	}

	if len(messages) == 0 {
		fmt.Println("📭 No messages in this room")
		return
	}

	fmt.Println("\n💬 Messages:")
	for _, msg := range messages {
		sender := "You"
		if msg.SenderID != c.user.ID {
			sender = msg.SenderID[:8] // Show first 8 chars of sender ID
		}
		fmt.Printf("[%s] %s: %s\n", 
			msg.Timestamp.Format("15:04"), sender, msg.Content)
	}
}

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: go run main.go <backend-url>")
		fmt.Println("Example: go run main.go http://localhost:3001")
		os.Exit(1)
	}

	baseURL := os.Args[1]
	client := NewChatClient(baseURL)
	
	fmt.Println("🚀 Starting WhatsApp Chat Client...")
	fmt.Printf("🔗 Connecting to: %s\n", baseURL)
	
	client.run()
}