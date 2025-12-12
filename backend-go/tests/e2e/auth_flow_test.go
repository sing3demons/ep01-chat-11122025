package e2e

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type AuthResponse struct {
	User struct {
		ID       string `json:"id"`
		Username string `json:"username"`
		Email    string `json:"email"`
		IsOnline bool   `json:"is_online"`
	} `json:"user"`
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}

func TestAuthFlowE2E(t *testing.T) {
	require.NoError(t, cleanupTables())
	require.NoError(t, waitForServer())

	t.Run("Complete Auth Flow", func(t *testing.T) {
		// Test user registration
		registerPayload := map[string]string{
			"username": "e2euser",
			"email":    "e2e@example.com",
			"password": "Password123",
		}

		registerBody, _ := json.Marshal(registerPayload)
		resp, err := testClient.Post(baseURL+"/api/v1/auth/register", "application/json", bytes.NewBuffer(registerBody))
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusCreated, resp.StatusCode)

		var registerResponse AuthResponse
		err = json.NewDecoder(resp.Body).Decode(&registerResponse)
		require.NoError(t, err)

		assert.Equal(t, "e2euser", registerResponse.User.Username)
		assert.Equal(t, "e2e@example.com", registerResponse.User.Email)
		assert.NotEmpty(t, registerResponse.AccessToken)
		assert.NotEmpty(t, registerResponse.RefreshToken)

		// Test user login
		loginPayload := map[string]string{
			"email":    "e2e@example.com",
			"password": "Password123",
		}

		loginBody, _ := json.Marshal(loginPayload)
		resp, err = testClient.Post(baseURL+"/api/v1/auth/login", "application/json", bytes.NewBuffer(loginBody))
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var loginResponse AuthResponse
		err = json.NewDecoder(resp.Body).Decode(&loginResponse)
		require.NoError(t, err)

		assert.Equal(t, "e2euser", loginResponse.User.Username)
		assert.True(t, loginResponse.User.IsOnline)
		assert.NotEmpty(t, loginResponse.AccessToken)

		// Test protected endpoint with valid token
		req, _ := http.NewRequest("GET", baseURL+"/api/v1/auth/me", nil)
		req.Header.Set("Authorization", "Bearer "+loginResponse.AccessToken)

		resp, err = testClient.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		// Test token refresh
		refreshPayload := map[string]string{
			"refresh_token": loginResponse.RefreshToken,
		}

		refreshBody, _ := json.Marshal(refreshPayload)
		resp, err = testClient.Post(baseURL+"/api/v1/auth/refresh", "application/json", bytes.NewBuffer(refreshBody))
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var refreshResponse map[string]interface{}
		err = json.NewDecoder(resp.Body).Decode(&refreshResponse)
		require.NoError(t, err)

		assert.NotEmpty(t, refreshResponse["access_token"])
		assert.NotEmpty(t, refreshResponse["refresh_token"])

		// Test logout
		req, _ = http.NewRequest("POST", baseURL+"/api/v1/auth/logout", nil)
		req.Header.Set("Authorization", "Bearer "+loginResponse.AccessToken)

		resp, err = testClient.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)
	})

	t.Run("Invalid Registration", func(t *testing.T) {
		// Test with invalid email
		registerPayload := map[string]string{
			"username": "testuser",
			"email":    "invalid-email",
			"password": "Password123",
		}

		registerBody, _ := json.Marshal(registerPayload)
		resp, err := testClient.Post(baseURL+"/api/v1/auth/register", "application/json", bytes.NewBuffer(registerBody))
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)

		var errorResponse ErrorResponse
		err = json.NewDecoder(resp.Body).Decode(&errorResponse)
		require.NoError(t, err)
		assert.Contains(t, errorResponse.Error, "invalid")
	})

	t.Run("Invalid Login", func(t *testing.T) {
		// Test with wrong password
		loginPayload := map[string]string{
			"email":    "e2e@example.com",
			"password": "WrongPassword",
		}

		loginBody, _ := json.Marshal(loginPayload)
		resp, err := testClient.Post(baseURL+"/api/v1/auth/login", "application/json", bytes.NewBuffer(loginBody))
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)

		var errorResponse ErrorResponse
		err = json.NewDecoder(resp.Body).Decode(&errorResponse)
		require.NoError(t, err)
		assert.Contains(t, errorResponse.Error, "invalid credentials")
	})

	t.Run("Unauthorized Access", func(t *testing.T) {
		// Test protected endpoint without token
		resp, err := testClient.Get(baseURL + "/api/v1/auth/me")
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)

		// Test protected endpoint with invalid token
		req, _ := http.NewRequest("GET", baseURL+"/api/v1/auth/me", nil)
		req.Header.Set("Authorization", "Bearer invalid-token")

		resp, err = testClient.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	})
}

func TestUserManagementE2E(t *testing.T) {
	require.NoError(t, cleanupTables())
	require.NoError(t, waitForServer())

	// Create and login user first
	accessToken := createAndLoginUser(t, "usertest", "usertest@example.com", "Password123")

	t.Run("Get Users List", func(t *testing.T) {
		req, _ := http.NewRequest("GET", baseURL+"/api/v1/users", nil)
		req.Header.Set("Authorization", "Bearer "+accessToken)

		resp, err := testClient.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var response map[string]interface{}
		err = json.NewDecoder(resp.Body).Decode(&response)
		require.NoError(t, err)

		users, ok := response["users"].([]interface{})
		assert.True(t, ok)
		assert.Greater(t, len(users), 0)
	})

	t.Run("Search Users", func(t *testing.T) {
		req, _ := http.NewRequest("GET", baseURL+"/api/v1/users/search?q=usertest", nil)
		req.Header.Set("Authorization", "Bearer "+accessToken)

		resp, err := testClient.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var response map[string]interface{}
		err = json.NewDecoder(resp.Body).Decode(&response)
		require.NoError(t, err)

		users, ok := response["users"].([]interface{})
		assert.True(t, ok)
		assert.Greater(t, len(users), 0)
	})

	t.Run("Get Online Users", func(t *testing.T) {
		req, _ := http.NewRequest("GET", baseURL+"/api/v1/users/online", nil)
		req.Header.Set("Authorization", "Bearer "+accessToken)

		resp, err := testClient.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var response map[string]interface{}
		err = json.NewDecoder(resp.Body).Decode(&response)
		require.NoError(t, err)

		users, ok := response["users"].([]interface{})
		assert.True(t, ok)
		assert.GreaterOrEqual(t, len(users), 1) // At least the logged-in user
	})
}

// Helper function to create and login a user, returns access token
func createAndLoginUser(t *testing.T, username, email, password string) string {
	// Register user
	registerPayload := map[string]string{
		"username": username,
		"email":    email,
		"password": password,
	}

	registerBody, _ := json.Marshal(registerPayload)
	resp, err := testClient.Post(baseURL+"/api/v1/auth/register", "application/json", bytes.NewBuffer(registerBody))
	require.NoError(t, err)
	defer resp.Body.Close()

	require.Equal(t, http.StatusCreated, resp.StatusCode)

	var registerResponse AuthResponse
	err = json.NewDecoder(resp.Body).Decode(&registerResponse)
	require.NoError(t, err)

	return registerResponse.AccessToken
}