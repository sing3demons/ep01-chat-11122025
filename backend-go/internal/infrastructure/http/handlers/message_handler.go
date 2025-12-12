package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"backend-go/internal/application/message"
	"backend-go/internal/shared/logger"
)

type MessageHandler struct {
	messageUseCase message.UseCase
	wsHub          WebSocketHub
	logger         logger.Logger
}

// WebSocketHub interface for WebSocket operations
type WebSocketHub interface {
	BroadcastToRoom(roomID string, message interface{})
}

func NewMessageHandler(messageUseCase message.UseCase, wsHub WebSocketHub, logger logger.Logger) *MessageHandler {
	return &MessageHandler{
		messageUseCase: messageUseCase,
		wsHub:          wsHub,
		logger:         logger,
	}
}

type SendMessageRequest struct {
	Content string `json:"content" binding:"required,min=1"`
	Type    string `json:"type,omitempty"` // text, image, file, etc.
}

type MessageResponse struct {
	ID        string `json:"id"`
	ChatRoomID string `json:"chat_room_id"`
	SenderID  string `json:"sender_id"`
	Content   string `json:"content"`
	Type      string `json:"type"`
	Status    string `json:"status"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

// SendMessage handles sending a message to a chat room
func (h *MessageHandler) SendMessage(c *gin.Context) {
	roomID := c.Param("room_id")
	if roomID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Room ID is required"})
		return
	}

	var req SendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Invalid send message request", "error", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		h.logger.Error("User ID not found in context")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Default message type to text if not specified
	messageType := req.Type
	if messageType == "" {
		messageType = "text"
	}

	result, err := h.messageUseCase.SendMessage(c.Request.Context(), message.SendMessageInput{
		ChatRoomID: roomID,
		SenderID:   userID.(string),
		Content:    req.Content,
		Type:       messageType,
	})

	if err != nil {
		h.logger.Error("Failed to send message", "error", err, "room_id", roomID, "user_id", userID)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	response := MessageResponse{
		ID:         result.ID,
		ChatRoomID: result.ChatRoomID,
		SenderID:   result.SenderID,
		Content:    result.Content,
		Type:       result.Type,
		Status:     result.Status,
		CreatedAt:  result.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:  result.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	// Broadcast message to WebSocket clients in the room
	if h.wsHub != nil {
		wsMessage := map[string]interface{}{
			"type":        "new_message",
			"message_id":  result.ID,
			"room_id":     result.ChatRoomID,
			"sender_id":   result.SenderID,
			"content":     result.Content,
			"message_type": result.Type,
			"status":      result.Status,
			"created_at":  result.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}
		h.wsHub.BroadcastToRoom(roomID, wsMessage)
	}

	h.logger.Info("Message sent successfully", "message_id", result.ID, "room_id", roomID, "user_id", userID)
	c.JSON(http.StatusCreated, response)
}

// GetMessages handles getting messages from a chat room
func (h *MessageHandler) GetMessages(c *gin.Context) {
	roomID := c.Param("room_id")
	if roomID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Room ID is required"})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		h.logger.Error("User ID not found in context")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Parse pagination parameters
	page := 1
	limit := 50
	if p := c.Query("page"); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil && parsed > 0 {
			page = parsed
		}
	}
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}

	// Parse before parameter for cursor-based pagination
	before := c.Query("before")

	result, err := h.messageUseCase.GetMessages(c.Request.Context(), message.GetMessagesInput{
		ChatRoomID: roomID,
		UserID:     userID.(string),
		Page:       page,
		Limit:      limit,
		Before:     before,
	})

	if err != nil {
		h.logger.Error("Failed to get messages", "error", err, "room_id", roomID, "user_id", userID)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var messages []MessageResponse
	for _, msg := range result.Messages {
		messages = append(messages, MessageResponse{
			ID:         msg.ID,
			ChatRoomID: msg.ChatRoomID,
			SenderID:   msg.SenderID,
			Content:    msg.Content,
			Type:       msg.Type,
			Status:     msg.Status,
			CreatedAt:  msg.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			UpdatedAt:  msg.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		})
	}

	response := gin.H{
		"messages": messages,
		"pagination": gin.H{
			"page":        page,
			"limit":       limit,
			"total":       result.Total,
			"total_pages": (result.Total + limit - 1) / limit,
			"has_more":    result.HasMore,
		},
	}

	h.logger.Info("Messages retrieved successfully", "room_id", roomID, "user_id", userID, "count", len(messages))
	c.JSON(http.StatusOK, response)
}

// GetMessage handles getting a specific message
func (h *MessageHandler) GetMessage(c *gin.Context) {
	messageID := c.Param("id")
	if messageID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Message ID is required"})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		h.logger.Error("User ID not found in context")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	result, err := h.messageUseCase.GetMessage(c.Request.Context(), message.GetMessageInput{
		MessageID: messageID,
		UserID:    userID.(string),
	})

	if err != nil {
		h.logger.Error("Failed to get message", "error", err, "message_id", messageID, "user_id", userID)
		c.JSON(http.StatusNotFound, gin.H{"error": "Message not found"})
		return
	}

	response := MessageResponse{
		ID:         result.ID,
		ChatRoomID: result.ChatRoomID,
		SenderID:   result.SenderID,
		Content:    result.Content,
		Type:       result.Type,
		Status:     result.Status,
		CreatedAt:  result.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:  result.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	h.logger.Info("Message retrieved successfully", "message_id", messageID, "user_id", userID)
	c.JSON(http.StatusOK, response)
}

// UpdateMessageStatus handles updating message status (read, delivered, etc.)
func (h *MessageHandler) UpdateMessageStatus(c *gin.Context) {
	messageID := c.Param("id")
	if messageID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Message ID is required"})
		return
	}

	var req struct {
		Status string `json:"status" binding:"required,oneof=delivered read"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Invalid update message status request", "error", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		h.logger.Error("User ID not found in context")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	err := h.messageUseCase.UpdateMessageStatus(c.Request.Context(), message.UpdateMessageStatusInput{
		MessageID: messageID,
		UserID:    userID.(string),
		Status:    req.Status,
	})

	if err != nil {
		h.logger.Error("Failed to update message status", "error", err, "message_id", messageID, "user_id", userID)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	h.logger.Info("Message status updated successfully", "message_id", messageID, "user_id", userID, "status", req.Status)
	c.JSON(http.StatusOK, gin.H{"message": "Message status updated successfully"})
}

// DeleteMessage handles deleting a message
func (h *MessageHandler) DeleteMessage(c *gin.Context) {
	messageID := c.Param("id")
	if messageID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Message ID is required"})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		h.logger.Error("User ID not found in context")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	err := h.messageUseCase.DeleteMessage(c.Request.Context(), message.DeleteMessageInput{
		MessageID: messageID,
		UserID:    userID.(string),
	})

	if err != nil {
		h.logger.Error("Failed to delete message", "error", err, "message_id", messageID, "user_id", userID)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	h.logger.Info("Message deleted successfully", "message_id", messageID, "user_id", userID)
	c.JSON(http.StatusOK, gin.H{"message": "Message deleted successfully"})
}