import { ValidationUtils } from '../validation';

describe('ValidationUtils', () => {
  describe('sanitizeString', () => {
    it('should remove harmful characters', () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = ValidationUtils.sanitizeString(input);
      expect(result).toBe('scriptalert("xss")/scriptHello');
    });

    it('should trim whitespace', () => {
      const input = '  hello world  ';
      const result = ValidationUtils.sanitizeString(input);
      expect(result).toBe('hello world');
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email', () => {
      expect(ValidationUtils.isValidEmail('test@example.com')).toBe(true);
    });

    it('should reject invalid email', () => {
      expect(ValidationUtils.isValidEmail('invalid-email')).toBe(false);
      expect(ValidationUtils.isValidEmail('test@')).toBe(false);
    });
  });

  describe('isValidUsername', () => {
    it('should validate correct username', () => {
      const result = ValidationUtils.isValidUsername('testuser123');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid username', () => {
      const result = ValidationUtils.isValidUsername('ab'); // too short
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('isValidMessage', () => {
    it('should validate correct message', () => {
      const result = ValidationUtils.isValidMessage('Hello world!');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty message', () => {
      const result = ValidationUtils.isValidMessage('');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('isValidUUID', () => {
    it('should validate correct UUID', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      expect(ValidationUtils.isValidUUID(uuid)).toBe(true);
    });

    it('should reject invalid UUID', () => {
      expect(ValidationUtils.isValidUUID('invalid-uuid')).toBe(false);
    });
  });

  describe('escapeHtml', () => {
    it('should escape HTML characters', () => {
      const input = '<div>Hello & "world"</div>';
      const result = ValidationUtils.escapeHtml(input);
      expect(result).toBe('&lt;div&gt;Hello &amp; &quot;world&quot;&lt;/div&gt;');
    });
  });

  describe('validatePagination', () => {
    it('should validate correct pagination', () => {
      const result = ValidationUtils.validatePagination('2', '10');
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.errors).toHaveLength(0);
    });

    it('should use defaults for invalid values', () => {
      const result = ValidationUtils.validatePagination('invalid', '-5');
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});