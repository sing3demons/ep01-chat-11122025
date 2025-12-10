import { VALIDATION_RULES } from '../config/constants';

/**
 * Input sanitization and validation utilities
 */

export class ValidationUtils {
  /**
   * Sanitize string input by removing potentially harmful characters
   */
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }
    
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .replace(/\0/g, ''); // Remove null bytes
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate username format and length
   */
  static isValidUsername(username: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (!username || typeof username !== 'string') {
      errors.push('Username is required');
      return { isValid: false, errors };
    }
    
    const sanitized = this.sanitizeString(username);
    
    if (sanitized.length < VALIDATION_RULES.USERNAME_MIN_LENGTH) {
      errors.push(`Username must be at least ${VALIDATION_RULES.USERNAME_MIN_LENGTH} characters long`);
    }
    
    if (sanitized.length > VALIDATION_RULES.USERNAME_MAX_LENGTH) {
      errors.push(`Username must not exceed ${VALIDATION_RULES.USERNAME_MAX_LENGTH} characters`);
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(sanitized)) {
      errors.push('Username can only contain letters, numbers, underscores, and hyphens');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate message content
   */
  static isValidMessage(content: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (!content || typeof content !== 'string') {
      errors.push('Message content is required');
      return { isValid: false, errors };
    }
    
    const sanitized = this.sanitizeString(content);
    
    if (sanitized.length === 0) {
      errors.push('Message cannot be empty');
    }
    
    if (sanitized.length > VALIDATION_RULES.MESSAGE_MAX_LENGTH) {
      errors.push(`Message must not exceed ${VALIDATION_RULES.MESSAGE_MAX_LENGTH} characters`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate UUID format
   */
  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Validate group name
   */
  static isValidGroupName(name: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (!name || typeof name !== 'string') {
      errors.push('Group name is required');
      return { isValid: false, errors };
    }
    
    const sanitized = this.sanitizeString(name);
    
    if (sanitized.length === 0) {
      errors.push('Group name cannot be empty');
    }
    
    if (sanitized.length > VALIDATION_RULES.GROUP_NAME_MAX_LENGTH) {
      errors.push(`Group name must not exceed ${VALIDATION_RULES.GROUP_NAME_MAX_LENGTH} characters`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Escape HTML characters to prevent XSS
   */
  static escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * Validate and sanitize search query
   */
  static sanitizeSearchQuery(query: string): string {
    if (typeof query !== 'string') {
      return '';
    }
    
    return query
      .trim()
      .replace(/[^\w\s-]/g, '') // Keep only alphanumeric, spaces, and hyphens
      .replace(/\s+/g, ' ') // Normalize whitespace
      .substring(0, 100); // Limit length
  }

  /**
   * Validate registration data
   */
  static validateRegistration(data: { username: string; email: string; password: string }): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    // Validate username
    const usernameValidation = this.isValidUsername(data.username);
    if (!usernameValidation.isValid) {
      errors.push(...usernameValidation.errors);
    }
    
    // Validate email
    if (!data.email || typeof data.email !== 'string') {
      errors.push('Email is required');
    } else if (!this.isValidEmail(data.email)) {
      errors.push('Invalid email format');
    }
    
    // Validate password presence (strength validation is done separately)
    if (!data.password || typeof data.password !== 'string') {
      errors.push('Password is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate pagination parameters
   */
  static validatePagination(page?: string, limit?: string): {
    page: number;
    limit: number;
    errors: string[];
  } {
    const errors: string[] = [];
    let validatedPage = 1;
    let validatedLimit = 20;
    
    if (page) {
      const pageNum = parseInt(page, 10);
      if (isNaN(pageNum) || pageNum < 1) {
        errors.push('Page must be a positive integer');
      } else if (pageNum > 1000) {
        errors.push('Page number too large');
      } else {
        validatedPage = pageNum;
      }
    }
    
    if (limit) {
      const limitNum = parseInt(limit, 10);
      if (isNaN(limitNum) || limitNum < 1) {
        errors.push('Limit must be a positive integer');
      } else if (limitNum > 100) {
        errors.push('Limit cannot exceed 100');
      } else {
        validatedLimit = limitNum;
      }
    }
    
    return {
      page: validatedPage,
      limit: validatedLimit,
      errors,
    };
  }
}