import { UserService } from '../user.service';
import { UserRepository } from '../user.repository';
import { ValidationUtils } from '../../utils/validation';

// Mock dependencies
jest.mock('../user.repository');
jest.mock('../../utils/validation');

const mockUserRepository = UserRepository as jest.Mocked<typeof UserRepository>;
const mockValidationUtils = ValidationUtils as jest.Mocked<typeof ValidationUtils>;

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Contact Management', () => {
    const userId = 'user-1';
    const contactId = 'user-2';

    beforeEach(() => {
      mockValidationUtils.isValidUUID.mockReturnValue(true);
    });

    describe('addContact', () => {
      it('should add contact successfully', async () => {
        const mockContactUser = {
          id: contactId,
          username: 'contact',
          email: 'contact@example.com',
          isOnline: true,
          lastSeen: new Date(),
          createdAt: new Date(),
          privacySettings: {
            userId: contactId,
            showOnlineStatus: true,
            showLastSeen: true,
            allowContactsOnly: false,
            updatedAt: new Date()
          }
        };

        mockUserRepository.findUserById.mockResolvedValue(mockContactUser as any);
        mockUserRepository.areUsersContacts.mockResolvedValue(false);
        mockUserRepository.isUserBlocked.mockResolvedValue(false);
        mockUserRepository.isBlockedBy.mockResolvedValue(false);
        mockUserRepository.addContact.mockResolvedValue();
        mockUserRepository.findUserByIdWithPrivacy.mockResolvedValue(mockContactUser as any);

        const result = await UserService.addContact(userId, contactId);

        expect(result.success).toBe(true);
        expect(result.data).toHaveProperty('id', contactId);
        expect(mockUserRepository.addContact).toHaveBeenCalledWith(userId, contactId);
      });

      it('should fail if trying to add self as contact', async () => {
        const result = await UserService.addContact(userId, userId);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Cannot add yourself as a contact');
      });

      it('should fail if contact user does not exist', async () => {
        mockUserRepository.findUserById.mockResolvedValue(null);

        const result = await UserService.addContact(userId, contactId);

        expect(result.success).toBe(false);
        expect(result.error).toBe('User not found');
      });

      it('should fail if users are already contacts', async () => {
        mockUserRepository.findUserById.mockResolvedValue({} as any);
        mockUserRepository.areUsersContacts.mockResolvedValue(true);

        const result = await UserService.addContact(userId, contactId);

        expect(result.success).toBe(false);
        expect(result.error).toBe('User is already in your contacts');
      });

      it('should fail if user is blocked', async () => {
        mockUserRepository.findUserById.mockResolvedValue({} as any);
        mockUserRepository.areUsersContacts.mockResolvedValue(false);
        mockUserRepository.isUserBlocked.mockResolvedValue(true);

        const result = await UserService.addContact(userId, contactId);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Cannot add blocked user as contact');
      });
    });

    describe('removeContact', () => {
      it('should remove contact successfully', async () => {
        mockUserRepository.areUsersContacts.mockResolvedValue(true);
        mockUserRepository.removeContact.mockResolvedValue();

        const result = await UserService.removeContact(userId, contactId);

        expect(result.success).toBe(true);
        expect(result.message).toBe('Contact removed successfully');
        expect(mockUserRepository.removeContact).toHaveBeenCalledWith(userId, contactId);
      });

      it('should fail if users are not contacts', async () => {
        mockUserRepository.areUsersContacts.mockResolvedValue(false);

        const result = await UserService.removeContact(userId, contactId);

        expect(result.success).toBe(false);
        expect(result.error).toBe('User is not in your contacts');
      });
    });

    describe('blockUser', () => {
      it('should block user successfully', async () => {
        const mockUserToBlock = {
          id: contactId,
          username: 'userToBlock',
          email: 'block@example.com'
        };

        mockUserRepository.findUserById.mockResolvedValue(mockUserToBlock as any);
        mockUserRepository.isUserBlocked.mockResolvedValue(false);
        mockUserRepository.areUsersContacts.mockResolvedValue(false);
        mockUserRepository.blockUser.mockResolvedValue();

        const result = await UserService.blockUser(userId, contactId);

        expect(result.success).toBe(true);
        expect(result.message).toBe('User blocked successfully');
        expect(mockUserRepository.blockUser).toHaveBeenCalledWith(userId, contactId);
      });

      it('should remove from contacts when blocking', async () => {
        const mockUserToBlock = {
          id: contactId,
          username: 'userToBlock',
          email: 'block@example.com'
        };

        mockUserRepository.findUserById.mockResolvedValue(mockUserToBlock as any);
        mockUserRepository.isUserBlocked.mockResolvedValue(false);
        mockUserRepository.areUsersContacts.mockResolvedValue(true);
        mockUserRepository.removeContact.mockResolvedValue();
        mockUserRepository.blockUser.mockResolvedValue();

        const result = await UserService.blockUser(userId, contactId);

        expect(result.success).toBe(true);
        expect(mockUserRepository.removeContact).toHaveBeenCalledWith(userId, contactId);
        expect(mockUserRepository.blockUser).toHaveBeenCalledWith(userId, contactId);
      });

      it('should fail if trying to block self', async () => {
        const result = await UserService.blockUser(userId, userId);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Cannot block yourself');
      });

      it('should fail if user is already blocked', async () => {
        mockUserRepository.findUserById.mockResolvedValue({} as any);
        mockUserRepository.isUserBlocked.mockResolvedValue(true);

        const result = await UserService.blockUser(userId, contactId);

        expect(result.success).toBe(false);
        expect(result.error).toBe('User is already blocked');
      });
    });

    describe('areUsersContacts', () => {
      it('should return true if users are contacts', async () => {
        mockUserRepository.areUsersContacts.mockResolvedValue(true);

        const result = await UserService.areUsersContacts(userId, contactId);

        expect(result).toBe(true);
        expect(mockUserRepository.areUsersContacts).toHaveBeenCalledWith(userId, contactId);
      });

      it('should return false if users are not contacts', async () => {
        mockUserRepository.areUsersContacts.mockResolvedValue(false);

        const result = await UserService.areUsersContacts(userId, contactId);

        expect(result).toBe(false);
      });

      it('should return false for invalid UUIDs', async () => {
        mockValidationUtils.isValidUUID.mockReturnValue(false);

        const result = await UserService.areUsersContacts('invalid', contactId);

        expect(result).toBe(false);
      });
    });
  });

  describe('Privacy and Status Management', () => {
    const userId = 'user-1';

    beforeEach(() => {
      mockValidationUtils.isValidUUID.mockReturnValue(true);
    });

    describe('updateOnlineStatus', () => {
      it('should update online status successfully', async () => {
        const mockUser = {
          id: userId,
          username: 'testuser',
          email: 'test@example.com',
          isOnline: true,
          lastSeen: new Date(),
          createdAt: new Date()
        };

        mockUserRepository.updateUserOnlineStatus.mockResolvedValue(mockUser as any);

        const result = await UserService.updateOnlineStatus(userId, true);

        expect(result.success).toBe(true);
        expect(result.data).toHaveProperty('isOnline', true);
        expect(mockUserRepository.updateUserOnlineStatus).toHaveBeenCalledWith(userId, true);
      });
    });

    describe('updatePrivacySettings', () => {
      it('should update privacy settings successfully', async () => {
        const privacyData = {
          showOnlineStatus: false,
          showLastSeen: true,
          allowContactsOnly: true
        };

        const mockUpdatedSettings = {
          userId,
          ...privacyData,
          updatedAt: new Date()
        };

        // Mock validation
        const mockValidation = {
          isValid: true,
          errors: [],
          sanitizedData: privacyData
        };

        // Mock UserModel validation (we need to mock this properly)
        const UserModel = require('../user.model').UserModel;
        jest.spyOn(UserModel, 'validatePrivacySettings').mockReturnValue(mockValidation);

        mockUserRepository.updatePrivacySettings.mockResolvedValue(mockUpdatedSettings as any);

        const result = await UserService.updatePrivacySettings(userId, privacyData);

        expect(result.success).toBe(true);
        expect(result.data).toHaveProperty('showOnlineStatus', false);
        expect(mockUserRepository.updatePrivacySettings).toHaveBeenCalledWith(userId, privacyData);
      });
    });
  });
});