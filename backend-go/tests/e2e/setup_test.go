package e2e

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	redisContainer "github.com/testcontainers/testcontainers-go/modules/redis"
	"	httpServer "backend-go/internal/infrastructure/http""
	"backend-go/internal/infrastructure/websocket"
	"backend-go/internal/shared/config"
	"backend-go/internal/shared/logger"
)

var (
	testServer      *http.Server
	testClient      *http.Client
	baseURL         string
	testDB          *pgxpool.Pool
	testRedis       *redis.Client
	testLogger      *logger.Logger
	pgContainer     *postgres.PostgresContainer
	redisContainer  *redisContainer.RedisContainer
	wsHub           *websocket.Hub
)

func TestMain(m *testing.M) {
	// Set Gin to test mode
	gin.SetMode(gin.TestMode)

	// Setup
	if err := setupE2EEnvironment(); err != nil {
		log.Fatalf("Failed to setup E2E environment: %v", err)
	}

	// Run tests
	code := m.Run()

	// Cleanup
	cleanup()

	os.Exit(code)
}

func setupE2EEnvironment() error {
	ctx := context.Background()

	// Setup PostgreSQL container
	var err error
	pgContainer, err = postgres.RunContainer(ctx,
		testcontainers.WithImage("postgres:15-alpine"),
		postgres.WithDatabase("e2e_testdb"),
		postgres.WithUsername("testuser"),
		postgres.WithPassword("testpass"),
		testcontainers.WithWaitStrategy(postgres.DefaultWaitStrategy()),
	)
	if err != nil {
		return fmt.Errorf("failed to start postgres container: %w", err)
	}

	// Setup Redis container
	redisContainer, err = redisContainer.RunContainer(ctx,
		testcontainers.WithImage("redis:7-alpine"),
	)
	if err != nil {
		return fmt.Errorf("failed to start redis container: %w", err)
	}

	// Get connection strings
	pgConnStr, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		return fmt.Errorf("failed to get postgres connection string: %w", err)
	}

	redisConnStr, err := redisContainer.ConnectionString(ctx)
	if err != nil {
		return fmt.Errorf("failed to get redis connection string: %w", err)
	}

	// Connect to databases
	testDB, err = pgxpool.New(ctx, pgConnStr)
	if err != nil {
		return fmt.Errorf("failed to connect to test database: %w", err)
	}

	opt, err := redis.ParseURL(redisConnStr)
	if err != nil {
		return fmt.Errorf("failed to parse redis URL: %w", err)
	}
	testRedis = redis.NewClient(opt)

	// Test connections
	if err := testDB.Ping(ctx); err != nil {
		return fmt.Errorf("failed to ping test database: %w", err)
	}

	if err := testRedis.Ping(ctx).Err(); err != nil {
		return fmt.Errorf("failed to ping test redis: %w", err)
	}

	// Run migrations
	if err := runMigrations(); err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	// Setup logger
	testLogger = logger.New("debug", "json")

	// Setup WebSocket hub
	wsHub = websocket.NewHub(testLogger)
	go wsHub.Run()

	// Setup HTTP server
	if err := setupHTTPServer(); err != nil {
		return fmt.Errorf("failed to setup HTTP server: %w", err)
	}

	// Setup HTTP client
	testClient = &http.Client{
		Timeout: 30 * time.Second,
	}

	return nil
}

func setupHTTPServer() error {
	cfg := &config.Config{
		Server: config.ServerConfig{
			Port: "0", // Let the system choose a free port
			Host: "localhost",
			Mode: "test",
		},
		Database: config.DatabaseConfig{
			// Database config will be handled by the existing connection
		},
		Redis: config.RedisConfig{
			// Redis config will be handled by the existing connection
		},
		JWT: config.JWTConfig{
			Secret:               "e2e-test-secret-key",
			ExpireHours:          24,
			RefreshExpireHours:   168,
		},
		CORS: config.CORSConfig{
			AllowedOrigins:   []string{"*"},
			AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
			AllowedHeaders:   []string{"*"},
			AllowCredentials: true,
		},
	}

	// Create server
	httpServerInstance, err := httpServer.New(cfg, testDB, testRedis, wsHub, testLogger)
	if err != nil {
		return fmt.Errorf("failed to create server: %w", err)
	}

	// Start server on a random port
	testServer = &http.Server{
		Addr:    ":0",
		Handler: httpServerInstance.Handler(),
	}

	// Start server in background
	go func() {
		if err := testServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("Server error: %v", err)
		}
	}()

	// Wait for server to start and get the actual port
	time.Sleep(100 * time.Millisecond)
	
	// For simplicity, we'll use a fixed port for E2E tests
	testServer.Addr = ":8081"
	baseURL = "http://localhost:8081"

	// Restart server with fixed port
	testServer.Close()
	testServer = &http.Server{
		Addr:    ":8081",
		Handler: httpServerInstance.Handler(),
	}

	go func() {
		if err := testServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("Server error: %v", err)
		}
	}()

	// Wait for server to be ready
	time.Sleep(500 * time.Millisecond)

	return nil
}

func runMigrations() error {
	ctx := context.Background()
	
	// Users table
	_, err := testDB.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS users (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			username VARCHAR(50) NOT NULL UNIQUE,
			email VARCHAR(255) NOT NULL UNIQUE,
			password_hash VARCHAR(255) NOT NULL,
			is_online BOOLEAN DEFAULT FALSE,
			last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);
	`)
	if err != nil {
		return fmt.Errorf("failed to create users table: %w", err)
	}

	// Chat rooms table
	_, err = testDB.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS chat_rooms (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			name VARCHAR(100),
			type VARCHAR(20) NOT NULL CHECK (type IN ('direct', 'group')),
			created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			last_message_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);
	`)
	if err != nil {
		return fmt.Errorf("failed to create chat_rooms table: %w", err)
	}

	// Chat room participants table
	_, err = testDB.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS chat_room_participants (
			chat_room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
			user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
			joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (chat_room_id, user_id)
		);
	`)
	if err != nil {
		return fmt.Errorf("failed to create chat_room_participants table: %w", err)
	}

	// Messages table
	_, err = testDB.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS messages (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			content TEXT NOT NULL,
			sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			chat_room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
			status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);
	`)
	if err != nil {
		return fmt.Errorf("failed to create messages table: %w", err)
	}

	return nil
}

func cleanup() {
	ctx := context.Background()

	if testServer != nil {
		testServer.Shutdown(ctx)
	}

	if wsHub != nil {
		wsHub.Shutdown()
	}

	if testDB != nil {
		testDB.Close()
	}

	if testRedis != nil {
		testRedis.Close()
	}

	if pgContainer != nil {
		pgContainer.Terminate(ctx)
	}

	if redisContainer != nil {
		redisContainer.Terminate(ctx)
	}
}

func cleanupTables() error {
	ctx := context.Background()
	
	tables := []string{"messages", "chat_room_participants", "chat_rooms", "users"}
	for _, table := range tables {
		_, err := testDB.Exec(ctx, fmt.Sprintf("TRUNCATE TABLE %s CASCADE", table))
		if err != nil {
			return fmt.Errorf("failed to truncate table %s: %w", table, err)
		}
	}
	
	return nil
}

func waitForServer() error {
	for i := 0; i < 30; i++ {
		resp, err := testClient.Get(baseURL + "/health")
		if err == nil {
			resp.Body.Close()
			if resp.StatusCode == http.StatusOK {
				return nil
			}
		}
		time.Sleep(100 * time.Millisecond)
	}
	return fmt.Errorf("server did not start within timeout")
}