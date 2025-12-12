package config

import (
	"fmt"
	"time"

	"github.com/spf13/viper"
)

// Config holds all configuration for the application
type Config struct {
	Server    ServerConfig    `mapstructure:"server"`
	Database  DatabaseConfig  `mapstructure:"database"`
	Redis     RedisConfig     `mapstructure:"redis"`
	JWT       JWTConfig       `mapstructure:"jwt"`
	WebSocket WebSocketConfig `mapstructure:"websocket"`
	Log       LogConfig       `mapstructure:"log"`
	CORS      CORSConfig      `mapstructure:"cors"`
}

// ServerConfig holds server configuration
type ServerConfig struct {
	Port string `mapstructure:"port"`
	Host string `mapstructure:"host"`
	Mode string `mapstructure:"mode"`
}

// DatabaseConfig holds database configuration
type DatabaseConfig struct {
	Host            string        `mapstructure:"host"`
	Port            int           `mapstructure:"port"`
	User            string        `mapstructure:"user"`
	Password        string        `mapstructure:"password"`
	Name            string        `mapstructure:"name"`
	SSLMode         string        `mapstructure:"ssl_mode"`
	MaxOpenConns    int           `mapstructure:"max_open_conns"`
	MaxIdleConns    int           `mapstructure:"max_idle_conns"`
	ConnMaxLifetime time.Duration `mapstructure:"conn_max_lifetime"`
}

// RedisConfig holds Redis configuration
type RedisConfig struct {
	Host       string `mapstructure:"host"`
	Port       int    `mapstructure:"port"`
	Password   string `mapstructure:"password"`
	DB         int    `mapstructure:"db"`
	MaxRetries int    `mapstructure:"max_retries"`
	PoolSize   int    `mapstructure:"pool_size"`
}

// JWTConfig holds JWT configuration
type JWTConfig struct {
	Secret               string        `mapstructure:"secret"`
	ExpireHours          int           `mapstructure:"expire_hours"`
	RefreshExpireHours   int           `mapstructure:"refresh_expire_hours"`
}

// WebSocketConfig holds WebSocket configuration
type WebSocketConfig struct {
	ReadBufferSize  int           `mapstructure:"read_buffer_size"`
	WriteBufferSize int           `mapstructure:"write_buffer_size"`
	MaxMessageSize  int64         `mapstructure:"max_message_size"`
	PingPeriod      time.Duration `mapstructure:"ping_period"`
	PongWait        time.Duration `mapstructure:"pong_wait"`
	WriteWait       time.Duration `mapstructure:"write_wait"`
}

// LogConfig holds logging configuration
type LogConfig struct {
	Level  string `mapstructure:"level"`
	Format string `mapstructure:"format"`
	Output string `mapstructure:"output"`
}

// CORSConfig holds CORS configuration
type CORSConfig struct {
	AllowedOrigins   []string `mapstructure:"allowed_origins"`
	AllowedMethods   []string `mapstructure:"allowed_methods"`
	AllowedHeaders   []string `mapstructure:"allowed_headers"`
	AllowCredentials bool     `mapstructure:"allow_credentials"`
}

// Load loads configuration from environment variables and config files
func Load() (*Config, error) {
	// Set default values
	setDefaults()

	// Read from environment variables
	viper.AutomaticEnv()

	// Try to read .env file
	viper.SetConfigName(".env")
	viper.SetConfigType("env")
	viper.AddConfigPath(".")
	
	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("failed to read .env file: %w", err)
		}
	}

	// Also try to read yaml config file (optional)
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath(".")
	viper.AddConfigPath("./config")
	
	if err := viper.MergeInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("failed to read config file: %w", err)
		}
	}

	var config Config
	if err := viper.Unmarshal(&config); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %w", err)
	}

	// Validate configuration
	if err := validate(&config); err != nil {
		return nil, fmt.Errorf("invalid configuration: %w", err)
	}

	return &config, nil
}

// setDefaults sets default configuration values
func setDefaults() {
	// Server defaults
	viper.SetDefault("server.port", "8080")
	viper.SetDefault("server.host", "0.0.0.0")
	viper.SetDefault("server.mode", "release")

	// Database defaults
	viper.SetDefault("database.host", "localhost")
	viper.SetDefault("database.port", 5432)
	viper.SetDefault("database.user", "postgres")
	viper.SetDefault("database.password", "password")
	viper.SetDefault("database.name", "whatsapp_chat_go")
	viper.SetDefault("database.ssl_mode", "disable")
	viper.SetDefault("database.max_open_conns", 25)
	viper.SetDefault("database.max_idle_conns", 25)
	viper.SetDefault("database.conn_max_lifetime", "5m")

	// Redis defaults
	viper.SetDefault("redis.host", "localhost")
	viper.SetDefault("redis.port", 6379)
	viper.SetDefault("redis.password", "")
	viper.SetDefault("redis.db", 0)
	viper.SetDefault("redis.max_retries", 3)
	viper.SetDefault("redis.pool_size", 10)

	// JWT defaults
	viper.SetDefault("jwt.secret", "your-secret-key")
	viper.SetDefault("jwt.expire_hours", 24)
	viper.SetDefault("jwt.refresh_expire_hours", 168)

	// WebSocket defaults
	viper.SetDefault("websocket.read_buffer_size", 1024)
	viper.SetDefault("websocket.write_buffer_size", 1024)
	viper.SetDefault("websocket.max_message_size", 512)
	viper.SetDefault("websocket.ping_period", "54s")
	viper.SetDefault("websocket.pong_wait", "60s")
	viper.SetDefault("websocket.write_wait", "10s")

	// Log defaults
	viper.SetDefault("log.level", "info")
	viper.SetDefault("log.format", "json")
	viper.SetDefault("log.output", "stdout")

	// CORS defaults
	viper.SetDefault("cors.allowed_origins", []string{"*"})
	viper.SetDefault("cors.allowed_methods", []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"})
	viper.SetDefault("cors.allowed_headers", []string{"*"})
	viper.SetDefault("cors.allow_credentials", true)

	// Environment variable bindings
	viper.BindEnv("server.port", "PORT")
	viper.BindEnv("server.host", "HOST")
	viper.BindEnv("server.mode", "GIN_MODE")

	viper.BindEnv("database.host", "DB_HOST")
	viper.BindEnv("database.port", "DB_PORT")
	viper.BindEnv("database.user", "DB_USER")
	viper.BindEnv("database.password", "DB_PASSWORD")
	viper.BindEnv("database.name", "DB_NAME")
	viper.BindEnv("database.ssl_mode", "DB_SSL_MODE")
	viper.BindEnv("database.max_open_conns", "DB_MAX_OPEN_CONNS")
	viper.BindEnv("database.max_idle_conns", "DB_MAX_IDLE_CONNS")
	viper.BindEnv("database.conn_max_lifetime", "DB_CONN_MAX_LIFETIME")

	viper.BindEnv("redis.host", "REDIS_HOST")
	viper.BindEnv("redis.port", "REDIS_PORT")
	viper.BindEnv("redis.password", "REDIS_PASSWORD")
	viper.BindEnv("redis.db", "REDIS_DB")
	viper.BindEnv("redis.max_retries", "REDIS_MAX_RETRIES")
	viper.BindEnv("redis.pool_size", "REDIS_POOL_SIZE")

	viper.BindEnv("jwt.secret", "JWT_SECRET")
	viper.BindEnv("jwt.expire_hours", "JWT_EXPIRE_HOURS")
	viper.BindEnv("jwt.refresh_expire_hours", "JWT_REFRESH_EXPIRE_HOURS")

	viper.BindEnv("websocket.read_buffer_size", "WS_READ_BUFFER_SIZE")
	viper.BindEnv("websocket.write_buffer_size", "WS_WRITE_BUFFER_SIZE")
	viper.BindEnv("websocket.max_message_size", "WS_MAX_MESSAGE_SIZE")
	viper.BindEnv("websocket.ping_period", "WS_PING_PERIOD")
	viper.BindEnv("websocket.pong_wait", "WS_PONG_WAIT")
	viper.BindEnv("websocket.write_wait", "WS_WRITE_WAIT")

	viper.BindEnv("log.level", "LOG_LEVEL")
	viper.BindEnv("log.format", "LOG_FORMAT")
	viper.BindEnv("log.output", "LOG_OUTPUT")
}

// validate validates the configuration
func validate(config *Config) error {
	if config.Server.Port == "" {
		return fmt.Errorf("server port is required")
	}

	if config.Database.Host == "" {
		return fmt.Errorf("database host is required")
	}

	if config.Database.Name == "" {
		return fmt.Errorf("database name is required")
	}

	if config.JWT.Secret == "" || config.JWT.Secret == "your-secret-key" {
		return fmt.Errorf("JWT secret must be set and not be the default value")
	}

	return nil
}