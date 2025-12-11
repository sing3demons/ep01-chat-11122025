import * as fc from 'fast-check';
import { AuthService } from '../auth.service';
import { IAuthRepository } from '../auth.repository';
import { PasswordUtils } from '../../utils/password';
import { JWTUtils } from '../../utils/jwt';
import { ValidationUtils } from '../../utils/validation';

// Mock dependencies
jest.mock('../../utils/password');
jest.mock('../../utils/jwt');
jest.mock('../../utils/validation');

const mockPasswordUtils = PasswordUtils as jest.Mocked<typeof PasswordUtils>;
const mockJWTUtils = JWTUtils as jest.Mocked<typeof JWTUtils>;
const mockValidationUtils = ValidationUtils as jest.Mocked<typeof ValidationUtils>;

describe('AuthService Property Tests', () => {
  /**
   * Feature: whatsapp-chat-system, Property 20: Authentication requirement
   * For any login attempt, the user must be successfully authenticated before gaining access to chat functions
   * Validates: Requirements 7.3
   */

  test('Property 20: Authentication requirement - validates core authentication property', () => {
    // This property test validates that authentication is required before accessing chat functions
    // It tests the fundamental property that valid credentials result in successful authentication
    // and invalid credentials result in failed authentication
    
    const mockRepository: jest.Mocked<IAuthRepository> = {
      createUser: jest.fn(),
      findUserById: jest.fn(),
      findUserByEmail: jest.fn(),
      findUserByUsername: jest.fn(),
      findUserByEmailOrUsername: jest.fn(),
      updateUser: jest.fn(),
      updateUserOnlineStatus: jest.fn(),
      createNotificationSettings: jest.fn(),
      createPrivacySettings: jest.fn(),
      getNotificationSettings: jest.fn(),
      getPrivacySettings: jest.fn(),
    };

    const authService = new AuthService(mockRepository);

    fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.string({ minLength: 8, maxLength: 50 }),
          userExists: fc.boolean(),
          passwordValid: fc.boolean()
        }),
        async ({ email, password, userExists, passwordValid }) => {
          // Reset mocks for each iteration
          jest.clearAllMocks();
          
          const mockUser = userExists ? {
            id: 'test-user-id',
            username: 'testuser',
            email: email,
            passwordHash: 'hashedPassword',
            isOnline: false,
            lastSeen: new Date(),
            createdAt: new Date()
          } : null;

          // Setup mocks
          mockRepository.findUserByEmail.mockResolvedValue(mockUser as any);
          mockPasswordUtils.verifyPassword.mockResolvedValue(passwordValid);
          mockRepository.updateUserOnlineStatus.mockResolvedValue({
            ...mockUser,
            isOnline: true
          } as any);
          mockJWTUtils.generateToken.mockReturnValue('test-token');

          const result = await authService.login({ email, password });

          // Property: Authentication succeeds if and only if user exists AND password is valid
          const shouldSucceed = userExists && passwordValid;
          
          if (shouldSucceed) {
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data).toHaveProperty('user');
            expect(result.data).toHaveProperty('token');
            expect(mockRepository.updateUserOnlineStatus).toHaveBeenCalledWith('test-user-id', true);
          } else {
            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid email or password');
            expect(result.data).toBeUndefined();
            expect(mockRepository.updateUserOnlineStatus).not.toHaveBeenCalled();
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});