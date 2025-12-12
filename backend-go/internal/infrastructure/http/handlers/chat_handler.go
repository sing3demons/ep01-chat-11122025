package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"backend-go/internal/application/chat"
	"backend-go/internal/shared/logger"
)

type ChatHandler struct {
	chatUseCase chat.UseCase
	logger      logger.Logger
}

func NewChatHandler(chatUseCase chat.UseCase, logger logger.Logger) *ChatHandler {
	return &ChatHandler{
		chatUseCase: chatUseCase,
		logger:      logger,
	}
}

type CreateChatRoomRequest struct {
	Name        string   `json:"name" binding:"required,min=1,max=100"`
	Description string   `json:"description,omitempty"`
	IsPrivate   bool     `json:"is_private"`
	Members     []string `json:"members,omitempty"`
}

type JoinChatRoomRequest struct {
	UserID string `json:"user_id" binding:"required"`
}

type ChatRoomResponse struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Description string   `json:"description,omitempty"`
	IsPrivate   bool     `json:"is_private"`
	CreatedBy   string   `json:"created_by"`
	Members     []string `json:"members"`
	CreatedAt   string   `json:"created_at"`
	UpdatedAt   string   `json:"updated_at"`
}

// CreateChatRoom handles chat room creation
func (h *ChatHandler) CreateChatRoom(c *gin.Context) {
	var req CreateChatRoomRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Invalid create chat room request", "error", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		h.logger.Error("User ID not found in context")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	result, err := h.chatUseCase.CreateChatRoom(c.Request.Context(), chat.CreateChatRoomInput{
		Name:        req.Name,
		Description: req.Description,
		IsPrivate:   req.IsPrivate,
		CreatedBy:   userID.(string),
		Members:     req.Members,
	})

	if err != nil {
		h.logger.Error("Failed to create chat room", "error", err, "user_id", userID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create chat room"})
		return
	}

	response := ChatRoomResponse{
		ID:          result.ID,
		Name:        result.Name,
		Description: result.Description,
		IsPrivate:   result.IsPrivate,
		CreatedBy:   result.CreatedBy,
		Members:     result.Members,
		CreatedAt:   result.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:   result.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	h.logger.Info("Chat room created successfully", "room_id", result.ID, "user_id", userID)
	c.JSON(http.StatusCreated, response)
}

// GetChatRooms handles getting user's chat rooms
func (h *ChatHandler) GetChatRooms(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		h.logger.Error("User ID not found in context")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Parse pagination parameters
	page := 1
	limit := 20
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

	result, err := h.chatUseCase.GetUserChatRooms(c.Request.Context(), chat.GetUserChatRoomsInput{
		UserID: userID.(string),
		Page:   page,
		Limit:  limit,
	})

	if err != nil {
		h.logger.Error("Failed to get chat rooms", "error", err, "user_id", userID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get chat rooms"})
		return
	}

	var chatRooms []ChatRoomResponse
	for _, room := range result.ChatRooms {
		chatRooms = append(chatRooms, ChatRoomResponse{
			ID:          room.ID,
			Name:        room.Name,
			Description: room.Description,
			IsPrivate:   room.IsPrivate,
			CreatedBy:   room.CreatedBy,
			Members:     room.Members,
			CreatedAt:   room.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			UpdatedAt:   room.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		})
	}

	response := gin.H{
		"chat_rooms": chatRooms,
		"pagination": gin.H{
			"page":        page,
			"limit":       limit,
			"total":       result.Total,
			"total_pages": (result.Total + limit - 1) / limit,
		},
	}

	h.logger.Info("Chat rooms retrieved successfully", "user_id", userID, "count", len(chatRooms))
	c.JSON(http.StatusOK, response)
}

// GetChatRoom handles getting a specific chat room
func (h *ChatHandler) GetChatRoom(c *gin.Context) {
	roomID := c.Param("id")
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

	result, err := h.chatUseCase.GetChatRoom(c.Request.Context(), chat.GetChatRoomInput{
		RoomID: roomID,
		UserID: userID.(string),
	})

	if err != nil {
		h.logger.Error("Failed to get chat room", "error", err, "room_id", roomID, "user_id", userID)
		c.JSON(http.StatusNotFound, gin.H{"error": "Chat room not found"})
		return
	}

	response := ChatRoomResponse{
		ID:          result.ID,
		Name:        result.Name,
		Description: result.Description,
		IsPrivate:   result.IsPrivate,
		CreatedBy:   result.CreatedBy,
		Members:     result.Members,
		CreatedAt:   result.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:   result.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	h.logger.Info("Chat room retrieved successfully", "room_id", roomID, "user_id", userID)
	c.JSON(http.StatusOK, response)
}

// JoinChatRoom handles joining a chat room
func (h *ChatHandler) JoinChatRoom(c *gin.Context) {
	roomID := c.Param("id")
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

	err := h.chatUseCase.JoinChatRoom(c.Request.Context(), chat.JoinChatRoomInput{
		RoomID: roomID,
		UserID: userID.(string),
	})

	if err != nil {
		h.logger.Error("Failed to join chat room", "error", err, "room_id", roomID, "user_id", userID)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	h.logger.Info("User joined chat room successfully", "room_id", roomID, "user_id", userID)
	c.JSON(http.StatusOK, gin.H{"message": "Joined chat room successfully"})
}

// LeaveChatRoom handles leaving a chat room
func (h *ChatHandler) LeaveChatRoom(c *gin.Context) {
	roomID := c.Param("id")
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

	err := h.chatUseCase.LeaveChatRoom(c.Request.Context(), chat.LeaveChatRoomInput{
		RoomID: roomID,
		UserID: userID.(string),
	})

	if err != nil {
		h.logger.Error("Failed to leave chat room", "error", err, "room_id", roomID, "user_id", userID)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	h.logger.Info("User left chat room successfully", "room_id", roomID, "user_id", userID)
	c.JSON(http.StatusOK, gin.H{"message": "Left chat room successfully"})
}