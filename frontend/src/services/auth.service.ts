import { LoginRequest, RegisterRequest, AuthResponse, User } from '../types';

// Token storage keys
const TOKEN_KEY = 'chat_token';
const USER_KEY = 'chat_user';

// API base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export class AuthService {
  /**
   * Login user
   */
  static async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    if (!data.success) {
      throw new Error(data.error || 'Login failed');
    }

    return data.data;
  }

  /**
   * Register user
   */
  static async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    if (!data.success) {
      throw new Error(data.error || 'Registration failed');
    }

    return data.data;
  }

  /**
   * Logout user
   */
  static async logout(token: string): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Logout API call failed:', error);
    }
  }

  /**
   * Verify token and get user
   */
  static async verifyToken(token: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Token verification failed');
    }

    if (!data.success) {
      throw new Error(data.error || 'Token verification failed');
    }

    return data.data;
  }

  /**
   * Refresh JWT token
   */
  static async refreshToken(token: string): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Token refresh failed');
    }

    if (!data.success) {
      throw new Error(data.error || 'Token refresh failed');
    }

    return data.data.token;
  }

  /**
   * Store auth data in localStorage
   */
  static storeAuthData(token: string, user: User): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  /**
   * Get stored auth data from localStorage
   */
  static getStoredAuthData(): { token: string; user: User } | null {
    const token = localStorage.getItem(TOKEN_KEY);
    const userStr = localStorage.getItem(USER_KEY);

    if (!token || !userStr) {
      return null;
    }

    try {
      const user = JSON.parse(userStr);
      return { token, user };
    } catch (error) {
      // Clear invalid data
      AuthService.clearAuthData();
      return null;
    }
  }

  /**
   * Clear auth data from localStorage
   */
  static clearAuthData(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  /**
   * Check if token is expired (basic check)
   */
  static isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      return true; // Consider invalid tokens as expired
    }
  }

  /**
   * Get token expiration time
   */
  static getTokenExpiration(token: string): Date | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return new Date(payload.exp * 1000);
    } catch (error) {
      return null;
    }
  }
}