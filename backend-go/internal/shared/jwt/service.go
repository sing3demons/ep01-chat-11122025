package jwt

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Service defines the interface for JWT operations
type Service interface {
	GenerateToken(userID, email string) (string, time.Time, error)
	ValidateToken(tokenString string) (map[string]interface{}, error)
	BlacklistToken(tokenString string) error
}

type service struct {
	secretKey     []byte
	tokenDuration time.Duration
	blacklist     map[string]bool // In production, use Redis or database
}

// Claims represents the JWT claims
type Claims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

// NewService creates a new JWT service
func NewService(secretKey string, tokenDuration time.Duration) Service {
	return &service{
		secretKey:     []byte(secretKey),
		tokenDuration: tokenDuration,
		blacklist:     make(map[string]bool),
	}
}

func (s *service) GenerateToken(userID, email string) (string, time.Time, error) {
	expiresAt := time.Now().Add(s.tokenDuration)

	claims := Claims{
		UserID: userID,
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    "whatsapp-chat-backend",
			Subject:   userID,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(s.secretKey)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("failed to sign token: %w", err)
	}

	return tokenString, expiresAt, nil
}

func (s *service) ValidateToken(tokenString string) (map[string]interface{}, error) {
	// Check if token is blacklisted
	if s.blacklist[tokenString] {
		return nil, fmt.Errorf("token is blacklisted")
	}

	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return s.secretKey, nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	if !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	claims, ok := token.Claims.(*Claims)
	if !ok {
		return nil, fmt.Errorf("invalid token claims")
	}

	// Convert claims to map
	claimsMap := map[string]interface{}{
		"user_id": claims.UserID,
		"email":   claims.Email,
		"exp":     claims.ExpiresAt.Time,
		"iat":     claims.IssuedAt.Time,
		"nbf":     claims.NotBefore.Time,
		"iss":     claims.Issuer,
		"sub":     claims.Subject,
	}

	return claimsMap, nil
}

func (s *service) BlacklistToken(tokenString string) error {
	// In production, this should be stored in Redis with expiration
	s.blacklist[tokenString] = true
	return nil
}