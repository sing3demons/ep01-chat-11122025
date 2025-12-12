package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"backend-go/internal/shared/config"
	"backend-go/internal/infrastructure/database/postgres"
	"backend-go/internal/infrastructure/database/redis"
	httpServer "backend-go/internal/infrastructure/http"
	"backend-go/internal/infrastructure/websocket"
	"backend-go/internal/shared/logger"
)

var (
	version = "dev"
	commit  = "none"
	date    = "unknown"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Initialize logger
	logger := logger.New(cfg.Log.Level, cfg.Log.Format)
	logger.Info("Starting WhatsApp Chat Backend Go",
		"version", version,
		"commit", commit,
		"date", date,
	)

	// Handle health check command
	if len(os.Args) > 1 && os.Args[1] == "health" {
		if err := healthCheck(cfg); err != nil {
			logger.Error("Health check failed", "error", err)
			os.Exit(1)
		}
		logger.Info("Health check passed")
		os.Exit(0)
	}

	// Initialize database
	db, err := postgres.Connect(cfg.Database)
	if err != nil {
		logger.Fatal("Failed to connect to database", "error", err)
	}
	defer postgres.Close(db)

	// Run migrations
	// if err := postgres.Migrate(db); err != nil {
	// 	logger.Fatal("Failed to run migrations", "error", err)
	// }

	// Initialize Redis
	redisClient, err := redis.Connect(cfg.Redis)
	if err != nil {
		logger.Fatal("Failed to connect to Redis", "error", err)
	}
	defer redis.Close(redisClient)

	// Initialize WebSocket hub
	wsHub := websocket.NewHub(*logger)
	go wsHub.Run()

	// Initialize HTTP server
	httpServerInstance, err := httpServer.New(cfg, db, redisClient, wsHub, logger)
	if err != nil {
		logger.Fatal("Failed to create HTTP server", "error", err)
	}

	// Start server
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.Server.Port),
		Handler:      httpServerInstance.Handler(),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in a goroutine
	go func() {
		logger.Info("Starting HTTP server", "port", cfg.Server.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Failed to start server", "error", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server...")

	// Graceful shutdown with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Shutdown WebSocket hub
	wsHub.Shutdown()

	// Shutdown HTTP server
	if err := srv.Shutdown(ctx); err != nil {
		logger.Fatal("Server forced to shutdown", "error", err)
	}

	logger.Info("Server exited")
}

// healthCheck performs a basic health check
func healthCheck(cfg *config.Config) error {
	// Check database connection
	db, err := postgres.Connect(cfg.Database)
	if err != nil {
		return fmt.Errorf("database connection failed: %w", err)
	}
	defer postgres.Close(db)

	// Check Redis connection
	redisClient, err := redis.Connect(cfg.Redis)
	if err != nil {
		return fmt.Errorf("redis connection failed: %w", err)
	}
	defer redis.Close(redisClient)

	// Ping Redis
	if err := redisClient.Ping(context.Background()).Err(); err != nil {
		return fmt.Errorf("redis ping failed: %w", err)
	}

	return nil
}

func init() {
	// Set Gin mode based on environment
	if os.Getenv("GIN_MODE") == "" {
		gin.SetMode(gin.ReleaseMode)
	}
}