/**
 * Demonstration script for utility functions
 * This file shows how to use the implemented utilities
 */

import { JWTUtils, PasswordUtils, ValidationUtils, EncryptionUtils } from './index';

async function demonstrateUtilities() {
  console.log('=== Utility Functions Demonstration ===\n');

  // JWT Utilities
  console.log('1. JWT Utilities:');
  const payload = { userId: 'user123', username: 'testuser', email: 'test@example.com' };
  const token = JWTUtils.generateToken(payload);
  console.log('Generated token:', token.substring(0, 50) + '...');
  
  const decoded = JWTUtils.verifyToken(token);
  console.log('Decoded payload:', decoded.userId, decoded.username);
  console.log('Token expired?', JWTUtils.isTokenExpired(token));
  console.log();

  // Password Utilities
  console.log('2. Password Utilities:');
  const password = 'MySecurePassword123!';
  const hash = await PasswordUtils.hashPassword(password);
  console.log('Password hash:', hash.substring(0, 30) + '...');
  
  const isValid = await PasswordUtils.verifyPassword(password, hash);
  console.log('Password verification:', isValid);
  
  const strength = PasswordUtils.validatePasswordStrength(password);
  console.log('Password strength valid:', strength.isValid);
  console.log();

  // Validation Utilities
  console.log('3. Validation Utilities:');
  const email = 'user@example.com';
  const username = 'testuser123';
  const message = 'Hello, this is a test message!';
  
  console.log('Email valid:', ValidationUtils.isValidEmail(email));
  console.log('Username valid:', ValidationUtils.isValidUsername(username).isValid);
  console.log('Message valid:', ValidationUtils.isValidMessage(message).isValid);
  
  const sanitized = ValidationUtils.sanitizeString('<script>alert("xss")</script>Hello');
  console.log('Sanitized string:', sanitized);
  console.log();

  // Encryption Utilities
  console.log('4. Encryption Utilities:');
  const secretMessage = 'This is a secret message!';
  const encrypted = EncryptionUtils.encryptMessage(secretMessage);
  console.log('Encrypted message:', encrypted.encrypted.substring(0, 30) + '...');
  
  const decrypted = EncryptionUtils.decryptMessage(
    encrypted.encrypted,
    encrypted.key,
    encrypted.iv,
    encrypted.tag
  );
  console.log('Decrypted message:', decrypted);
  
  const hash256 = EncryptionUtils.hashData('test data');
  console.log('SHA-256 hash:', hash256.substring(0, 20) + '...');
  
  const secureToken = EncryptionUtils.generateSecureToken(16);
  console.log('Secure token:', secureToken);
  console.log();

  console.log('=== All utilities working correctly! ===');
}

// Run demonstration if this file is executed directly
if (require.main === module) {
  demonstrateUtilities().catch(console.error);
}

export { demonstrateUtilities };