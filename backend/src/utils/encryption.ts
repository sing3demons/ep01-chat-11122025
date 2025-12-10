import * as crypto from 'crypto';
import { SECURITY_CONFIG } from '../config/constants';

/**
 * Message encryption and decryption utilities
 */

export class EncryptionUtils {
  private static readonly algorithm = 'aes-256-cbc';
  private static readonly keyLength = 32; // 256 bits
  private static readonly ivLength = 16; // 128 bits
  private static readonly tagLength = 16; // 128 bits

  /**
   * Generate a random encryption key
   */
  static generateKey(): Buffer {
    return crypto.randomBytes(this.keyLength);
  }

  /**
   * Generate a random initialization vector
   */
  static generateIV(): Buffer {
    return crypto.randomBytes(this.ivLength);
  }

  /**
   * Encrypt a message using AES-256-CBC
   */
  static encryptMessage(message: string, key?: Buffer): {
    encrypted: string;
    key: string;
    iv: string;
    tag: string;
  } {
    try {
      const encryptionKey = key || this.generateKey();
      const iv = this.generateIV();
      
      const cipher = crypto.createCipheriv(this.algorithm, encryptionKey, iv);
      
      let encrypted = cipher.update(message, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Create authentication tag using HMAC
      const tag = crypto.createHmac('sha256', encryptionKey).update(encrypted).digest('hex');
      
      return {
        encrypted,
        key: encryptionKey.toString('hex'),
        iv: iv.toString('hex'),
        tag,
      };
    } catch (error) {
      throw new Error('Failed to encrypt message');
    }
  }

  /**
   * Decrypt a message using AES-256-CBC
   */
  static decryptMessage(
    encrypted: string,
    key: string,
    iv: string,
    tag: string
  ): string {
    try {
      const keyBuffer = Buffer.from(key, 'hex');
      const ivBuffer = Buffer.from(iv, 'hex');
      
      // Verify authentication tag first
      const expectedTag = crypto.createHmac('sha256', keyBuffer).update(encrypted).digest('hex');
      if (tag !== expectedTag) {
        throw new Error('Invalid authentication tag');
      }
      
      const decipher = crypto.createDecipheriv(this.algorithm, keyBuffer, ivBuffer);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error('Failed to decrypt message');
    }
  }

  /**
   * Hash data using SHA-256
   */
  static hashData(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate a secure random token
   */
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Create HMAC signature
   */
  static createHMAC(data: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  static verifyHMAC(data: string, signature: string, secret: string): boolean {
    try {
      const expectedSignature = this.createHMAC(data, secret);
      const sigBuffer = Buffer.from(signature, 'hex');
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');
      
      // Ensure buffers are the same length
      if (sigBuffer.length !== expectedBuffer.length) {
        return false;
      }
      
      return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
    } catch {
      return false;
    }
  }

  /**
   * Encrypt data for transport (simplified version for WebSocket messages)
   */
  static encryptForTransport(data: string): {
    encrypted: string;
    signature: string;
  } {
    const secret = process.env.JWT_SECRET || 'fallback-secret';
    const timestamp = Date.now().toString();
    const payload = `${timestamp}:${data}`;
    
    // Simple XOR encryption for transport (in production, use proper TLS)
    const payloadBuffer = Buffer.from(payload, 'utf8');
    const encryptedBuffer = Buffer.alloc(payloadBuffer.length);
    
    for (let i = 0; i < payloadBuffer.length; i++) {
      encryptedBuffer[i] = payloadBuffer[i] ^ secret.charCodeAt(i % secret.length);
    }
    
    const encrypted = encryptedBuffer.toString('base64');
    const signature = this.createHMAC(encrypted, secret);
    
    return { encrypted, signature };
  }

  /**
   * Decrypt data from transport
   */
  static decryptFromTransport(encrypted: string, signature: string): string {
    const secret = process.env.JWT_SECRET || 'fallback-secret';
    
    // Verify signature first
    if (!this.verifyHMAC(encrypted, signature, secret)) {
      throw new Error('Invalid message signature');
    }
    
    // Decrypt
    const encryptedBuffer = Buffer.from(encrypted, 'base64');
    const decryptedBuffer = Buffer.alloc(encryptedBuffer.length);
    
    for (let i = 0; i < encryptedBuffer.length; i++) {
      decryptedBuffer[i] = encryptedBuffer[i] ^ secret.charCodeAt(i % secret.length);
    }
    
    const decrypted = decryptedBuffer.toString('utf8');
    
    // Extract timestamp and data
    const [timestamp, ...dataParts] = decrypted.split(':');
    const data = dataParts.join(':');
    
    // Check if message is not too old (5 minutes)
    const messageTime = parseInt(timestamp, 10);
    const currentTime = Date.now();
    if (currentTime - messageTime > 5 * 60 * 1000) {
      throw new Error('Message timestamp too old');
    }
    
    return data;
  }

  /**
   * Generate a deterministic key from user credentials (for user-specific encryption)
   */
  static deriveUserKey(userId: string, secret: string): Buffer {
    return crypto.pbkdf2Sync(userId, secret, 10000, this.keyLength, 'sha256');
  }
}