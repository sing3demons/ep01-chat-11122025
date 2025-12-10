import { PasswordUtils } from '../password';

describe('PasswordUtils', () => {
  describe('hashPassword and verifyPassword', () => {
    it('should hash and verify password correctly', async () => {
      const password = 'TestPassword123!';
      const hash = await PasswordUtils.hashPassword(password);
      
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(password);
      
      const isValid = await PasswordUtils.verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hash = await PasswordUtils.hashPassword(password);
      
      const isValid = await PasswordUtils.verifyPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should validate strong password', () => {
      const result = PasswordUtils.validatePasswordStrength('StrongPass123!');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject weak passwords', () => {
      const result = PasswordUtils.validatePasswordStrength('weak');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('generateSecurePassword', () => {
    it('should generate password of specified length', () => {
      const password = PasswordUtils.generateSecurePassword(16);
      expect(password).toHaveLength(16);
    });

    it('should generate strong password by default', () => {
      const password = PasswordUtils.generateSecurePassword();
      const validation = PasswordUtils.validatePasswordStrength(password);
      expect(validation.isValid).toBe(true);
    });
  });
});