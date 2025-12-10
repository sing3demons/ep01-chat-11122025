import { JWTUtils } from '../jwt';

describe('JWTUtils', () => {
  const mockPayload = {
    userId: 'test-user-id',
    username: 'testuser',
    email: 'test@example.com',
  };

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-key';
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = JWTUtils.generateToken(mockPayload);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const token = JWTUtils.generateToken(mockPayload);
      const decoded = JWTUtils.verifyToken(token);
      
      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.username).toBe(mockPayload.username);
      expect(decoded.email).toBe(mockPayload.email);
    });

    it('should throw error for invalid token', () => {
      expect(() => {
        JWTUtils.verifyToken('invalid-token');
      }).toThrow('Invalid token');
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from Bearer header', () => {
      const token = 'test-token';
      const header = `Bearer ${token}`;
      
      expect(JWTUtils.extractTokenFromHeader(header)).toBe(token);
    });

    it('should return null for invalid header format', () => {
      expect(JWTUtils.extractTokenFromHeader('Invalid header')).toBeNull();
      expect(JWTUtils.extractTokenFromHeader(undefined)).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for valid token', () => {
      const token = JWTUtils.generateToken(mockPayload);
      expect(JWTUtils.isTokenExpired(token)).toBe(false);
    });

    it('should return true for invalid token', () => {
      expect(JWTUtils.isTokenExpired('invalid-token')).toBe(true);
    });
  });
});