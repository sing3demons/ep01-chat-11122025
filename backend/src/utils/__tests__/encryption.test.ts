import { EncryptionUtils } from '../encryption';

describe('EncryptionUtils', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-key';
  });

  describe('encryptMessage and decryptMessage', () => {
    it('should encrypt and decrypt message correctly', () => {
      const message = 'Hello, this is a secret message!';
      const encrypted = EncryptionUtils.encryptMessage(message);
      
      expect(encrypted.encrypted).toBeDefined();
      expect(encrypted.key).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.tag).toBeDefined();
      
      const decrypted = EncryptionUtils.decryptMessage(
        encrypted.encrypted,
        encrypted.key,
        encrypted.iv,
        encrypted.tag
      );
      
      expect(decrypted).toBe(message);
    });

    it('should fail to decrypt with wrong key', () => {
      const message = 'Secret message';
      const encrypted = EncryptionUtils.encryptMessage(message);
      const wrongKey = EncryptionUtils.generateKey().toString('hex');
      
      expect(() => {
        EncryptionUtils.decryptMessage(
          encrypted.encrypted,
          wrongKey,
          encrypted.iv,
          encrypted.tag
        );
      }).toThrow('Failed to decrypt message');
    });
  });

  describe('hashData', () => {
    it('should generate consistent hash', () => {
      const data = 'test data';
      const hash1 = EncryptionUtils.hashData(data);
      const hash2 = EncryptionUtils.hashData(data);
      
      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('string');
    });
  });

  describe('generateSecureToken', () => {
    it('should generate token of specified length', () => {
      const token = EncryptionUtils.generateSecureToken(16);
      expect(token).toHaveLength(32); // hex encoding doubles the length
    });

    it('should generate different tokens each time', () => {
      const token1 = EncryptionUtils.generateSecureToken();
      const token2 = EncryptionUtils.generateSecureToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('HMAC functions', () => {
    it('should create and verify HMAC correctly', () => {
      const data = 'test data';
      const secret = 'secret key';
      
      const signature = EncryptionUtils.createHMAC(data, secret);
      const isValid = EncryptionUtils.verifyHMAC(data, signature, secret);
      
      expect(isValid).toBe(true);
    });

    it('should reject invalid HMAC', () => {
      const data = 'test data';
      const secret = 'secret key';
      const wrongSecret = 'wrong secret';
      
      const signature = EncryptionUtils.createHMAC(data, secret);
      const isValid = EncryptionUtils.verifyHMAC(data, signature, wrongSecret);
      
      expect(isValid).toBe(false);
    });
  });

  describe('transport encryption', () => {
    it('should encrypt and decrypt for transport', () => {
      const data = 'transport data';
      const encrypted = EncryptionUtils.encryptForTransport(data);
      
      expect(encrypted.encrypted).toBeDefined();
      expect(encrypted.signature).toBeDefined();
      
      const decrypted = EncryptionUtils.decryptFromTransport(
        encrypted.encrypted,
        encrypted.signature
      );
      
      expect(decrypted).toBe(data);
    });

    it('should reject tampered transport data', () => {
      const data = 'transport data';
      const encrypted = EncryptionUtils.encryptForTransport(data);
      
      expect(() => {
        EncryptionUtils.decryptFromTransport(
          encrypted.encrypted,
          'invalid-signature'
        );
      }).toThrow('Invalid message signature');
    });
  });
});