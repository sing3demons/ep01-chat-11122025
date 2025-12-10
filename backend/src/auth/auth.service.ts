import { JWTUtils } from '../utils/jwt';
import { PasswordUtils } from '../utils/password';
import { ValidationUtils } from '../utils/validation';
import { User } from '../user';
import { ApiResponse } from '../types';
import { AuthRepository } from './auth.repository';

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: Omit<User, 'passwordHash'>;
  token: string;
}

/**
 * Authentication Service
 * Handles business logic for authentication operations
 */
export class AuthService {
  /**
   * Register a new user
   */
  static async register(data: RegisterRequest): Promise<ApiResponse> {
    try {
      // Validate input data
      const validation = ValidationUtils.validateRegistration(data);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        };
      }

      // Check if user already exists
      const existingUser = await AuthRepository.findUserByEmailOrUsername(data.email, data.username);

      if (existingUser) {
        return {
          success: false,
          error: existingUser.email === data.email 
            ? 'Email already registered' 
            : 'Username already taken'
        };
      }

      // Validate password strength
      const passwordValidation = PasswordUtils.validatePasswordStrength(data.password);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: passwordValidation.errors.join(', ')
        };
      }

      // Hash password
      const passwordHash = await PasswordUtils.hashPassword(data.password);

      // Create user
      const user = await AuthRepository.createUser({
        username: data.username,
        email: data.email,
        passwordHash
      });

      // Create default settings
      await Promise.all([
        AuthRepository.createNotificationSettings(user.id),
        AuthRepository.createPrivacySettings(user.id)
      ]);

      // Generate JWT token
      const token = JWTUtils.generateToken({
        userId: user.id,
        username: user.username,
        email: user.email
      });

      const userResponse: Omit<User, 'passwordHash'> = {
        id: user.id,
        username: user.username,
        email: user.email,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        createdAt: user.createdAt
      };

      return {
        success: true,
        data: {
          user: userResponse,
          token
        } as AuthResponse,
        message: 'User registered successfully'
      };

    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: 'Registration failed. Please try again.'
      };
    }
  }

  /**
   * Login user
   */
  static async login(data: LoginRequest): Promise<ApiResponse> {
    try {
      // Validate input
      if (!data.email || !data.password) {
        return {
          success: false,
          error: 'Email and password are required'
        };
      }

      // Find user by email
      const user = await AuthRepository.findUserByEmail(data.email);

      if (!user) {
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      // Verify password
      const isPasswordValid = await PasswordUtils.verifyPassword(data.password, user.passwordHash);
      if (!isPasswordValid) {
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      // Update user online status
      await AuthRepository.updateUserOnlineStatus(user.id, true);

      // Generate JWT token
      const token = JWTUtils.generateToken({
        userId: user.id,
        username: user.username,
        email: user.email
      });

      const userResponse: Omit<User, 'passwordHash'> = {
        id: user.id,
        username: user.username,
        email: user.email,
        isOnline: true,
        lastSeen: new Date(),
        createdAt: user.createdAt
      };

      return {
        success: true,
        data: {
          user: userResponse,
          token
        } as AuthResponse,
        message: 'Login successful'
      };

    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Login failed. Please try again.'
      };
    }
  }

  /**
   * Logout user
   */
  static async logout(userId: string): Promise<ApiResponse> {
    try {
      // Update user offline status
      await AuthRepository.updateUserOnlineStatus(userId, false);

      return {
        success: true,
        message: 'Logout successful'
      };

    } catch (error) {
      console.error('Logout error:', error);
      return {
        success: false,
        error: 'Logout failed'
      };
    }
  }

  /**
   * Verify JWT token and get user
   */
  static async verifyToken(token: string): Promise<ApiResponse> {
    try {
      // Verify token
      const decoded = JWTUtils.verifyToken(token);

      // Get user from database
      const user = await AuthRepository.findUserById(decoded.userId);

      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      const userResponse: Omit<User, 'passwordHash'> = {
        id: user.id,
        username: user.username,
        email: user.email,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        createdAt: user.createdAt
      };

      return {
        success: true,
        data: userResponse
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token verification failed'
      };
    }
  }

  /**
   * Refresh JWT token
   */
  static async refreshToken(token: string): Promise<ApiResponse> {
    try {
      // Verify current token
      const decoded = JWTUtils.verifyToken(token);

      // Get user from database
      const user = await AuthRepository.findUserById(decoded.userId);

      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Generate new token
      const newToken = JWTUtils.generateToken({
        userId: user.id,
        username: user.username,
        email: user.email
      });

      return {
        success: true,
        data: { token: newToken },
        message: 'Token refreshed successfully'
      };

    } catch (error) {
      return {
        success: false,
        error: 'Token refresh failed'
      };
    }
  }

  /**
   * Change password (for authenticated users)
   */
  static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<ApiResponse> {
    try {
      // Get user
      const user = await AuthRepository.findUserById(userId);

      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Verify current password
      const isCurrentPasswordValid = await PasswordUtils.verifyPassword(currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        return {
          success: false,
          error: 'Current password is incorrect'
        };
      }

      // Validate new password
      const passwordValidation = PasswordUtils.validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: passwordValidation.errors.join(', ')
        };
      }

      // Hash new password
      const passwordHash = await PasswordUtils.hashPassword(newPassword);

      // Update password
      await AuthRepository.updateUser(userId, { passwordHash });

      return {
        success: true,
        message: 'Password changed successfully'
      };

    } catch (error) {
      console.error('Change password error:', error);
      return {
        success: false,
        error: 'Password change failed'
      };
    }
  }

  /**
   * Get user session info
   */
  static async getSessionInfo(userId: string): Promise<ApiResponse> {
    try {
      const user = await AuthRepository.findUserById(userId);

      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Get settings
      const [notificationSettings, privacySettings] = await Promise.all([
        AuthRepository.getNotificationSettings(userId),
        AuthRepository.getPrivacySettings(userId)
      ]);

      const userResponse = {
        id: user.id,
        username: user.username,
        email: user.email,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        createdAt: user.createdAt,
        notificationSettings,
        privacySettings
      };

      return {
        success: true,
        data: userResponse
      };

    } catch (error) {
      console.error('Get session info error:', error);
      return {
        success: false,
        error: 'Failed to get session info'
      };
    }
  }
}