package http

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	
	"backend-go/internal/application/auth"
	"backend-go/internal/application/chat"
	"backend-go/internal/application/message"
	"backend-go/internal/infrastructure/database/postgres"
	"backend-go/internal/infrastructure/database/redis"
	"backend-go/internal/infrastructure/database/postgres/repositories"
	"backend-go/internal/infrastructure/http/handlers"
	"backend-go/internal/infrastructure/http/middleware"
	"backend-go/internal/infrastructure/websocket"
	"backend-go/internal/shared/config"
	"backend-go/internal/shared/jwt"
	"backend-go/internal/shared/logger"
	"backend-go/internal/shared/validation"
)

// Server represents the HTTP server
type Server struct {
	config      *config.Config
	logger      *logger.Logger
	router      *gin.Engine
	db          *postgres.DB
	redisClient *redis.Client
	wsHub       *websocket.Hub
}

// New creates a new HTTP server
func New(
	cfg *config.Config,
	db *postgres.DB,
	redisClient *redis.Client,
	wsHub *websocket.Hub,
	logger *logger.Logger,
) (*Server, error) {
	// Set Gin mode
	if cfg.Server.Mode != "" {
		gin.SetMode(cfg.Server.Mode)
	}

	// Create router
	router := gin.New()

	server := &Server{
		config:      cfg,
		logger:      logger,
		router:      router,
		db:          db,
		redisClient: redisClient,
		wsHub:       wsHub,
	}

	// Setup middleware
	server.setupMiddleware()

	// Setup routes
	server.setupRoutes()

	return server, nil
}

// Handler returns the HTTP handler
func (s *Server) Handler() http.Handler {
	return s.router
}

// setupMiddleware configures middleware
func (s *Server) setupMiddleware() {
	// Recovery middleware
	s.router.Use(gin.Recovery())

	// Logger middleware (simple gin logger for now)
	s.router.Use(gin.Logger())

	// CORS middleware (simple CORS for now)
	s.router.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		
		c.Next()
	})
}

// setupRoutes configures routes
func (s *Server) setupRoutes() {
	// Health check
	s.router.GET("/health", s.healthCheck)

	// WebSocket endpoint
	s.router.GET("/ws", s.websocketHandler)

	// API routes
	api := s.router.Group("/api/v1")
	{
		s.setupAuthRoutes(api)
		s.setupChatRoutes(api)
		// s.setupMessageRoutes(api) // TODO: fix message routes panic
	}
}

// setupAuthRoutes configures authentication routes
func (s *Server) setupAuthRoutes(api *gin.RouterGroup) {
	// Create dependencies
	userRepo := repositories.NewUserRepository(s.db.Pool, *s.logger)
	jwtService := jwt.NewService(s.config.JWT.Secret, time.Duration(s.config.JWT.ExpireHours)*time.Hour)
	validator := validation.New()

	// Create use case
	authUseCase := auth.NewUseCase(userRepo, jwtService, validator, *s.logger)

	// Create handler
	authHandler := handlers.NewAuthHandler(authUseCase, *s.logger)

	// Auth routes
	authGroup := api.Group("/auth")
	{
		authGroup.POST("/register", authHandler.Register)
		authGroup.POST("/login", authHandler.Login)
		authGroup.POST("/refresh", authHandler.RefreshToken)
		authGroup.POST("/logout", middleware.Auth(jwtService), authHandler.Logout)
	}
}

// healthCheck handles health check requests
func (s *Server) healthCheck(c *gin.Context) {
	// Simple health check
	if err := s.db.Health(c.Request.Context()); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status":   "unhealthy",
			"database": "down",
			"error":    err.Error(),
		})
		return
	}

	// Check Redis
	if err := s.redisClient.Client.Ping(c.Request.Context()).Err(); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status": "unhealthy",
			"redis":  "down",
			"error":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":   "healthy",
		"database": "up",
		"redis":    "up",
	})
}

// setupChatRoutes configures chat room routes
func (s *Server) setupChatRoutes(api *gin.RouterGroup) {
	// Create dependencies
	userRepo := repositories.NewUserRepository(s.db.Pool, *s.logger)
	chatRepo := repositories.NewChatRepository(s.db.Pool, *s.logger)
	jwtService := jwt.NewService(s.config.JWT.Secret, time.Duration(s.config.JWT.ExpireHours)*time.Hour)
	validator := validation.New()

	// Create use case
	chatUseCase := chat.NewUseCase(chatRepo, userRepo, validator, *s.logger)

	// Create handler
	chatHandler := handlers.NewChatHandler(chatUseCase, *s.logger)

	// Chat routes
	chatGroup := api.Group("/chatrooms")
	chatGroup.Use(middleware.Auth(jwtService))
	{
		chatGroup.GET("", chatHandler.GetChatRooms)
		chatGroup.POST("", chatHandler.CreateChatRoom)
		chatGroup.GET("/:id", chatHandler.GetChatRoom)
		chatGroup.POST("/:id/join", chatHandler.JoinChatRoom)
		chatGroup.POST("/:id/leave", chatHandler.LeaveChatRoom)
	}
}

// setupMessageRoutes configures message routes
func (s *Server) setupMessageRoutes(api *gin.RouterGroup) {
	// Create dependencies
	chatRepo := repositories.NewChatRepository(s.db.Pool, *s.logger)
	messageRepo := repositories.NewMessageRepository(s.db.Pool, *s.logger)
	jwtService := jwt.NewService(s.config.JWT.Secret, time.Duration(s.config.JWT.ExpireHours)*time.Hour)
	validator := validation.New()

	// Create use case
	messageUseCase := message.NewUseCase(messageRepo, chatRepo, validator, *s.logger)

	// Create handler
	messageHandler := handlers.NewMessageHandler(messageUseCase, s.wsHub, *s.logger)

	// Message routes under chat rooms
	chatGroup := api.Group("/chatrooms/:room_id")
	chatGroup.Use(middleware.Auth(jwtService))
	{
		chatGroup.GET("/messages", messageHandler.GetMessages)
		chatGroup.POST("/messages", messageHandler.SendMessage)
	}

	// Individual message operations
	messageGroup := api.Group("/messages")
	messageGroup.Use(middleware.Auth(jwtService))
	{
		messageGroup.GET("/:id", messageHandler.GetMessage)
		messageGroup.PUT("/:id/status", messageHandler.UpdateMessageStatus)
		messageGroup.DELETE("/:id", messageHandler.DeleteMessage)
	}
}

// websocketHandler handles WebSocket connections
func (s *Server) websocketHandler(c *gin.Context) {
	// Get JWT token from query parameter or header
	token := c.Query("token")
	if token == "" {
		token = c.GetHeader("Authorization")
		if token != "" && len(token) > 7 && token[:7] == "Bearer " {
			token = token[7:]
		}
	}

	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing token"})
		return
	}

	// Validate token
	jwtService := jwt.NewService(s.config.JWT.Secret, time.Duration(s.config.JWT.ExpireHours)*time.Hour)
	claims, err := jwtService.ValidateToken(token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
		return
	}

	userID, ok := claims["user_id"].(string)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token claims"})
		return
	}

	// Handle WebSocket connection
	s.wsHub.HandleConnection(c.Writer, c.Request, userID)
}