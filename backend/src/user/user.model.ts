import { User as PrismaUser, PrivacySettings as PrismaPrivacySettings } from '@prisma/client';
import { ValidationUtils } from '../utils/validation';
import { VALIDATION_RULES } from '../config/constants';

/**
 * User model interfaces and validation
 */

export interface User {
  id: string;
  username: string;
  email: string;
  isOnline: boolean;
  lastSeen: Date;
  createdAt: Date;
}

export interface UserWithPrivacy extends User {
  privacySettings?: PrivacySettings;
}

export interface PrivacySettings {
  userId: string;
  showOnlineStatus: boolean;
  showLastSeen: boolean;
  allowContactsOnly: boolean;
  updatedAt: Date;
}

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  isOnline?: boolean;
  lastSeen?: Date;
}

export interface UserValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData?: any;
}

/**
 * User model validation functions
 */
export class UserModel {
  /**
   * Validate user creation data
   */
  static validateCreateUser(data: CreateUserData): UserValidationResult {
    const errors: string[] = [];
    const sanitizedData: Partial<CreateUserData> = {};

    // Validate and sanitize username
    if (!data.username) {
      errors.push('Username is required');
    } else {
      const usernameValidation = ValidationUtils.isValidUsername(data.username);
      if (!usernameValidation.isValid) {
        errors.push(...usernameValidation.errors);
      } else {
        sanitizedData.username = ValidationUtils.sanitizeString(data.username);
      }
    }

    // Validate and sanitize email
    if (!data.email) {
      errors.push('Email is required');
    } else {
      const sanitizedEmail = ValidationUtils.sanitizeString(data.email).toLowerCase();
      if (!ValidationUtils.isValidEmail(sanitizedEmail)) {
        errors.push('Invalid email format');
      } else if (sanitizedEmail.length > VALIDATION_RULES.EMAIL_MAX_LENGTH) {
        errors.push(`Email must not exceed ${VALIDATION_RULES.EMAIL_MAX_LENGTH} characters`);
      } else {
        sanitizedData.email = sanitizedEmail;
      }
    }

    // Validate password
    if (!data.password) {
      errors.push('Password is required');
    } else if (typeof data.password !== 'string') {
      errors.push('Password must be a string');
    } else if (data.password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    } else if (data.password.length > 128) {
      errors.push('Password must not exceed 128 characters');
    } else {
      sanitizedData.password = data.password; // Don't sanitize password
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? sanitizedData as CreateUserData : undefined,
    };
  }

  /**
   * Validate user update data
   */
  static validateUpdateUser(data: UpdateUserData): UserValidationResult {
    const errors: string[] = [];
    const sanitizedData: Partial<UpdateUserData> = {};

    // Validate username if provided
    if (data.username !== undefined) {
      if (data.username === null || data.username === '') {
        errors.push('Username cannot be empty');
      } else {
        const usernameValidation = ValidationUtils.isValidUsername(data.username);
        if (!usernameValidation.isValid) {
          errors.push(...usernameValidation.errors);
        } else {
          sanitizedData.username = ValidationUtils.sanitizeString(data.username);
        }
      }
    }

    // Validate email if provided
    if (data.email !== undefined) {
      if (data.email === null || data.email === '') {
        errors.push('Email cannot be empty');
      } else {
        const sanitizedEmail = ValidationUtils.sanitizeString(data.email).toLowerCase();
        if (!ValidationUtils.isValidEmail(sanitizedEmail)) {
          errors.push('Invalid email format');
        } else if (sanitizedEmail.length > VALIDATION_RULES.EMAIL_MAX_LENGTH) {
          errors.push(`Email must not exceed ${VALIDATION_RULES.EMAIL_MAX_LENGTH} characters`);
        } else {
          sanitizedData.email = sanitizedEmail;
        }
      }
    }

    // Validate isOnline if provided
    if (data.isOnline !== undefined) {
      if (typeof data.isOnline !== 'boolean') {
        errors.push('isOnline must be a boolean');
      } else {
        sanitizedData.isOnline = data.isOnline;
      }
    }

    // Validate lastSeen if provided
    if (data.lastSeen !== undefined) {
      if (!(data.lastSeen instanceof Date) || isNaN(data.lastSeen.getTime())) {
        errors.push('lastSeen must be a valid Date');
      } else {
        sanitizedData.lastSeen = data.lastSeen;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? sanitizedData : undefined,
    };
  }

  /**
   * Validate privacy settings
   */
  static validatePrivacySettings(data: Partial<PrivacySettings>): UserValidationResult {
    const errors: string[] = [];
    const sanitizedData: Partial<PrivacySettings> = {};

    // Validate userId if provided
    if (data.userId !== undefined) {
      if (!ValidationUtils.isValidUUID(data.userId)) {
        errors.push('Invalid user ID format');
      } else {
        sanitizedData.userId = data.userId;
      }
    }

    // Validate boolean fields
    const booleanFields: (keyof PrivacySettings)[] = [
      'showOnlineStatus',
      'showLastSeen',
      'allowContactsOnly',
    ];

    for (const field of booleanFields) {
      if (data[field] !== undefined) {
        if (typeof data[field] !== 'boolean') {
          errors.push(`${field} must be a boolean`);
        } else {
          (sanitizedData as any)[field] = data[field];
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? sanitizedData : undefined,
    };
  }

  /**
   * Check if user data contains sensitive information
   */
  static hasSensitiveData(user: any): boolean {
    const sensitiveFields = ['password', 'passwordHash', 'token', 'refreshToken'];
    return sensitiveFields.some(field => field in user);
  }

  /**
   * Remove sensitive data from user object
   */
  static sanitizeUserForResponse(user: any): User {
    const { passwordHash, password, ...safeUser } = user;
    return safeUser as User;
  }
}