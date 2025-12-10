import * as jwt from 'jsonwebtoken';
import { AuthToken } from '../types';
import { JWT_CONFIG } from '../config/constants';

/**
 * JWT utility functions for token generation and validation
 */

export class JWTUtils {
  private static readonly secret = process.env.JWT_SECRET || 'fallback-secret-key';
  
  /**
   * Generate a JWT token for a user
   */
  static generateToken(payload: { userId: string; username: string; email: string }): string {
    return jwt.sign(
      payload,
      this.secret,
      {
        expiresIn: JWT_CONFIG.EXPIRES_IN,
        algorithm: JWT_CONFIG.ALGORITHM as jwt.Algorithm,
      }
    );
  }

  /**
   * Verify and decode a JWT token
   */
  static verifyToken(token: string): AuthToken {
    try {
      const decoded = jwt.verify(token, this.secret) as AuthToken;
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw new Error('Token verification failed');
    }
  }

  /**
   * Decode token without verification (for debugging purposes)
   */
  static decodeToken(token: string): AuthToken | null {
    try {
      return jwt.decode(token) as AuthToken;
    } catch {
      return null;
    }
  }

  /**
   * Check if token is expired without throwing
   */
  static isTokenExpired(token: string): boolean {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) return true;
      
      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch {
      return true;
    }
  }

  /**
   * Extract token from Authorization header
   */
  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) return null;
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }
    
    return parts[1];
  }
}