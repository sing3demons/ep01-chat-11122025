import { AuthService } from '../auth.service';
import { AuthRepository } from '../auth.repository';
import { PasswordUtils } from '../../utils/password';
import { JWTUtils } from '../../utils/jwt';

// Mock dependencies
jest.mock('../auth.repository');
jest.mock('../../utils/password');
jest.mock('../../utils/jwt');

const mockAuthRepository = AuthRepository as jest.Mocked<typeof AuthRepository>;
const mockPasswordUtils = PasswordUtils as jest.Mocked<typeof PasswordUtils>;
const mockJWTUtils = JWTUtils as jest.Mocked<typeof JWTUtils>;

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const validRegisterData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123!'
    };

    it('should register a new user successfully', async () => {
      // Mock implementations
      mockAuthRepository.findUserByEmailOrUsername.mockResolvedValue(null);
      mockPasswordUtils.validatePasswordStrength.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockPasswordUtils.hashPassword.mockResolvedValue('hashedPassword');
      mockAuthRepository.createUser.mockResolvedValue({
        id: 'user-id',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashedPassword',
        isOnline: true,
        lastSeen: new Date(),
        createdAt: new Date()
      } as any);
      mockAuthRepository.createNotificationSettings.mockResolvedValue({} as any);
      mockAuthRepository.createPrivacySettings.mockResolvedValue({} as any);
      mockJWTUtils.generateToken.mockReturnValue('jwt-token');

      const result = await AuthService.register(validRegisterData);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('user');
      expect(result.data).toHaveProperty('token');
      expect(mockAuthRepository.createUser).toHaveBeenCalledWith({
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashedPassword'
      });
    });

    it('should fail if email already exists', async () => {
      mockAuthRepository.findUserByEmailOrUsername.mockResolvedValue({
        email: 'test@example.com'
      } as any);

      const result = await AuthService.register(validRegisterData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email already registered');
    });

    it('should fail if username already exists', async () => {
      mockAuthRepository.findUserByEmailOrUsername.mockResolvedValue({
        username: 'testuser',
        email: 'different@example.com'
      } as any);

      const result = await AuthService.register(validRegisterData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Username already taken');
    });

    it('should fail if password is weak', async () => {
      mockAuthRepository.findUserByEmailOrUsername.mockResolvedValue(null);
      mockPasswordUtils.validatePasswordStrength.mockReturnValue({
        isValid: false,
        errors: ['Password must be at least 8 characters long']
      });

      const result = await AuthService.register({
        ...validRegisterData,
        password: 'weak'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Password must be at least 8 characters long');
    });
  });

  describe('login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'Password123!'
    };

    it('should login user successfully', async () => {
      const mockUser = {
        id: 'user-id',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashedPassword',
        isOnline: false,
        lastSeen: new Date(),
        createdAt: new Date()
      };

      mockAuthRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      mockPasswordUtils.verifyPassword.mockResolvedValue(true);
      mockAuthRepository.updateUserOnlineStatus.mockResolvedValue(mockUser as any);
      mockJWTUtils.generateToken.mockReturnValue('jwt-token');

      const result = await AuthService.login(validLoginData);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('user');
      expect(result.data).toHaveProperty('token');
      expect(mockAuthRepository.updateUserOnlineStatus).toHaveBeenCalledWith('user-id', true);
    });

    it('should fail if user not found', async () => {
      mockAuthRepository.findUserByEmail.mockResolvedValue(null);

      const result = await AuthService.login(validLoginData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
    });

    it('should fail if password is incorrect', async () => {
      mockAuthRepository.findUserByEmail.mockResolvedValue({
        passwordHash: 'hashedPassword'
      } as any);
      mockPasswordUtils.verifyPassword.mockResolvedValue(false);

      const result = await AuthService.login(validLoginData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      mockAuthRepository.updateUserOnlineStatus.mockResolvedValue({} as any);

      const result = await AuthService.logout('user-id');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Logout successful');
      expect(mockAuthRepository.updateUserOnlineStatus).toHaveBeenCalledWith('user-id', false);
    });
  });

  describe('verifyToken', () => {
    it('should verify token successfully', async () => {
      const mockDecoded = {
        userId: 'user-id',
        username: 'testuser',
        email: 'test@example.com'
      };
      const mockUser = {
        id: 'user-id',
        username: 'testuser',
        email: 'test@example.com',
        isOnline: true,
        lastSeen: new Date(),
        createdAt: new Date()
      };

      mockJWTUtils.verifyToken.mockReturnValue(mockDecoded as any);
      mockAuthRepository.findUserById.mockResolvedValue(mockUser as any);

      const result = await AuthService.verifyToken('valid-token');

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id', 'user-id');
    });

    it('should fail if token is invalid', async () => {
      mockJWTUtils.verifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await AuthService.verifyToken('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid token');
    });

    it('should fail if user not found', async () => {
      mockJWTUtils.verifyToken.mockReturnValue({
        userId: 'user-id'
      } as any);
      mockAuthRepository.findUserById.mockResolvedValue(null);

      const result = await AuthService.verifyToken('valid-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });
});