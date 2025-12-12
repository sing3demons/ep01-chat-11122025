package logger

import (
	"io"
	"os"
	"strings"

	"github.com/sirupsen/logrus"
)

// Logger wraps logrus logger
type Logger struct {
	*logrus.Logger
}

// New creates a new logger instance
func New(level, format string) *Logger {
	logger := logrus.New()
	
	// Set log level
	logLevel, err := logrus.ParseLevel(level)
	if err != nil {
		logLevel = logrus.InfoLevel
	}
	logger.SetLevel(logLevel)
	
	// Set log format
	switch strings.ToLower(format) {
	case "json":
		logger.SetFormatter(&logrus.JSONFormatter{
			TimestampFormat: "2006-01-02T15:04:05.000Z07:00",
		})
	case "text":
		logger.SetFormatter(&logrus.TextFormatter{
			FullTimestamp:   true,
			TimestampFormat: "2006-01-02T15:04:05.000Z07:00",
		})
	default:
		logger.SetFormatter(&logrus.JSONFormatter{
			TimestampFormat: "2006-01-02T15:04:05.000Z07:00",
		})
	}
	
	// Set output
	logger.SetOutput(os.Stdout)
	
	return &Logger{Logger: logger}
}

// WithFields creates a new logger with additional fields
func (l *Logger) WithFields(fields map[string]interface{}) *Logger {
	return &Logger{
		Logger: l.Logger.WithFields(fields).Logger,
	}
}

// WithField creates a new logger with an additional field
func (l *Logger) WithField(key string, value interface{}) *Logger {
	return &Logger{
		Logger: l.Logger.WithField(key, value).Logger,
	}
}

// WithError creates a new logger with error field
func (l *Logger) WithError(err error) *Logger {
	return &Logger{
		Logger: l.Logger.WithError(err).Logger,
	}
}

// SetOutput sets the logger output
func (l *Logger) SetOutput(output io.Writer) {
	l.Logger.SetOutput(output)
}

// HTTP request logging helpers
func (l *Logger) LogHTTPRequest(method, path, userAgent, clientIP string, statusCode int, duration int64) {
	l.WithFields(map[string]interface{}{
		"method":      method,
		"path":        path,
		"user_agent":  userAgent,
		"client_ip":   clientIP,
		"status_code": statusCode,
		"duration_ms": duration,
	}).Info("HTTP request")
}

// Database operation logging helpers
func (l *Logger) LogDBOperation(operation, table string, duration int64, err error) {
	fields := map[string]interface{}{
		"operation":   operation,
		"table":       table,
		"duration_ms": duration,
	}
	
	if err != nil {
		l.WithFields(fields).WithError(err).Error("Database operation failed")
	} else {
		l.WithFields(fields).Debug("Database operation completed")
	}
}

// WebSocket logging helpers
func (l *Logger) LogWebSocketConnection(userID, connectionID string, action string) {
	l.WithFields(map[string]interface{}{
		"user_id":       userID,
		"connection_id": connectionID,
		"action":        action,
	}).Info("WebSocket connection event")
}

func (l *Logger) LogWebSocketMessage(userID, connectionID, messageType string, messageSize int) {
	l.WithFields(map[string]interface{}{
		"user_id":       userID,
		"connection_id": connectionID,
		"message_type":  messageType,
		"message_size":  messageSize,
	}).Debug("WebSocket message")
}

// Authentication logging helpers
func (l *Logger) LogAuthAttempt(email, clientIP string, success bool, reason string) {
	fields := map[string]interface{}{
		"email":     email,
		"client_ip": clientIP,
		"success":   success,
	}
	
	if reason != "" {
		fields["reason"] = reason
	}
	
	if success {
		l.WithFields(fields).Info("Authentication successful")
	} else {
		l.WithFields(fields).Warn("Authentication failed")
	}
}

// Business logic logging helpers
func (l *Logger) LogUserAction(userID, action string, metadata map[string]interface{}) {
	fields := map[string]interface{}{
		"user_id": userID,
		"action":  action,
	}
	
	// Merge metadata
	for k, v := range metadata {
		fields[k] = v
	}
	
	l.WithFields(fields).Info("User action")
}

func (l *Logger) LogChatRoomEvent(chatRoomID, userID, event string, metadata map[string]interface{}) {
	fields := map[string]interface{}{
		"chat_room_id": chatRoomID,
		"user_id":      userID,
		"event":        event,
	}
	
	// Merge metadata
	for k, v := range metadata {
		fields[k] = v
	}
	
	l.WithFields(fields).Info("Chat room event")
}

// Performance logging helpers
func (l *Logger) LogSlowQuery(query string, duration int64, threshold int64) {
	if duration > threshold {
		l.WithFields(map[string]interface{}{
			"query":       query,
			"duration_ms": duration,
			"threshold":   threshold,
		}).Warn("Slow query detected")
	}
}

func (l *Logger) LogMemoryUsage(allocMB, sysMB uint64) {
	l.WithFields(map[string]interface{}{
		"alloc_mb": allocMB,
		"sys_mb":   sysMB,
	}).Debug("Memory usage")
}

// Error logging helpers
func (l *Logger) LogPanic(err interface{}, stack []byte) {
	l.WithFields(map[string]interface{}{
		"panic": err,
		"stack": string(stack),
	}).Fatal("Application panic")
}

func (l *Logger) LogValidationError(field, value, message string) {
	l.WithFields(map[string]interface{}{
		"field":   field,
		"value":   value,
		"message": message,
	}).Warn("Validation error")
}

// System logging helpers
func (l *Logger) LogStartup(version, commit, buildTime string) {
	l.WithFields(map[string]interface{}{
		"version":    version,
		"commit":     commit,
		"build_time": buildTime,
	}).Info("Application starting")
}

func (l *Logger) LogShutdown(reason string) {
	l.WithField("reason", reason).Info("Application shutting down")
}

func (l *Logger) LogHealthCheck(component string, healthy bool, message string) {
	fields := map[string]interface{}{
		"component": component,
		"healthy":   healthy,
	}
	
	if message != "" {
		fields["message"] = message
	}
	
	if healthy {
		l.WithFields(fields).Debug("Health check passed")
	} else {
		l.WithFields(fields).Error("Health check failed")
	}
}