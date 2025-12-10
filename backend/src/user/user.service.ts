import { UserRepository } from './user.repository';
import { UserModel, UpdateUserData, PrivacySettings } from './user.model';
import { UserConverter } from './user.converter';
import { ApiResponse } from '../types';
import { ValidationUtils } from '../utils/validation';

/**
 * User Service
 * Handles business logic for user operations
 */
export class UserService {
  /**
   * Get user by ID with privacy filtering
   */
  static async getUserById(userId: string, viewerId?: string): Promise<ApiResponse> {
    try {
      // Validate user ID
      if (!ValidationUtils.isValidUUID(userId)) {
        return {
          success: false,
          error: 'Invalid user ID format'
        };
      }

      // Get user with privacy settings
      const user = await UserRepository.findUserByIdWithPrivacy(userId);

      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Convert to API format
      const userWithPrivacy = UserConverter.toApiUserWithPrivacy(user);

      // Apply privacy filtering if viewing another user's profile
      let filteredUser;
      if (viewerId && viewerId !== userId) {
        // Check if viewer is a contact
        const isContact = await UserRepository.areUsersContacts(viewerId, userId);
        filteredUser = UserConverter.applyPrivacyFilter(userWithPrivacy, viewerId, isContact);
      } else {
        filteredUser = UserConverter.toApiUser(user);
      }

      return {
        success: true,
        data: filteredUser
      };

    } catch (error) {
      console.error('Get user by ID error:', error);
      return {
        success: false,
        error: 'Failed to get user'
      };
    }
  }

  /**
   * Update user profile
   */
  static async updateUser(userId: string, updateData: UpdateUserData): Promise<ApiResponse> {
    try {
      // Validate user ID
      if (!ValidationUtils.isValidUUID(userId)) {
        return {
          success: false,
          error: 'Invalid user ID format'
        };
      }

      // Validate update data
      const validation = UserModel.validateUpdateUser(updateData);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        };
      }

      // Check if user exists
      const existingUser = await UserRepository.findUserById(userId);
      if (!existingUser) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Check for email/username conflicts if updating them
      if (validation.sanitizedData?.email || validation.sanitizedData?.username) {
        const conflictUser = await UserRepository.findUserByEmailOrUsername(
          validation.sanitizedData.email || existingUser.email,
          validation.sanitizedData.username || existingUser.username
        );

        if (conflictUser && conflictUser.id !== userId) {
          const conflictField = conflictUser.email === validation.sanitizedData?.email ? 'email' : 'username';
          return {
            success: false,
            error: `${conflictField} is already taken`
          };
        }
      }

      // Update user
      const updatedUser = await UserRepository.updateUser(userId, validation.sanitizedData!);

      // Convert to API format
      const apiUser = UserConverter.toApiUser(updatedUser);

      return {
        success: true,
        data: apiUser,
        message: 'User updated successfully'
      };

    } catch (error) {
      console.error('Update user error:', error);
      return {
        success: false,
        error: 'Failed to update user'
      };
    }
  }

  /**
   * Search users by username
   */
  static async searchUsers(
    query: string,
    viewerId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<ApiResponse> {
    try {
      // Validate search query
      const sanitizedQuery = ValidationUtils.sanitizeSearchQuery(query);
      if (sanitizedQuery.length < 2) {
        return {
          success: false,
          error: 'Search query must be at least 2 characters long'
        };
      }

      // Validate pagination
      if (limit < 1 || limit > 100) {
        return {
          success: false,
          error: 'Limit must be between 1 and 100'
        };
      }

      if (offset < 0) {
        return {
          success: false,
          error: 'Offset must be non-negative'
        };
      }

      // Search users
      const users = await UserRepository.searchUsersByUsername(sanitizedQuery, limit, offset);

      // Convert to API format and apply privacy filtering
      const apiUsers = await Promise.all(users.map(async user => {
        const userWithPrivacy = UserConverter.toApiUserWithPrivacy(user);
        
        // Apply privacy filtering for other users
        if (user.id !== viewerId) {
          const isContact = await UserRepository.areUsersContacts(viewerId, user.id);
          return UserConverter.applyPrivacyFilter(userWithPrivacy, viewerId, isContact);
        }
        
        return UserConverter.toApiUser(user);
      }));

      return {
        success: true,
        data: {
          users: apiUsers,
          pagination: {
            limit,
            offset,
            total: users.length
          }
        }
      };

    } catch (error) {
      console.error('Search users error:', error);
      return {
        success: false,
        error: 'Failed to search users'
      };
    }
  }

  /**
   * Update user online status
   */
  static async updateOnlineStatus(userId: string, isOnline: boolean): Promise<ApiResponse> {
    try {
      // Validate user ID
      if (!ValidationUtils.isValidUUID(userId)) {
        return {
          success: false,
          error: 'Invalid user ID format'
        };
      }

      // Update online status
      const updatedUser = await UserRepository.updateUserOnlineStatus(userId, isOnline);

      // Convert to API format
      const apiUser = UserConverter.toApiUser(updatedUser);

      // Broadcast status change to contacts via WebSocket (if available)
      try {
        // Import WebSocketService dynamically to avoid circular dependencies
        const { WebSocketService } = await import('../websocket');
        const wsService = WebSocketService.getInstance();
        await wsService.sendUserStatusChange(userId, isOnline, updatedUser.lastSeen);
      } catch (wsError) {
        // WebSocket broadcasting is optional, don't fail the status update
        console.warn('Failed to broadcast status change via WebSocket:', wsError);
      }

      return {
        success: true,
        data: apiUser,
        message: `User status updated to ${isOnline ? 'online' : 'offline'}`
      };

    } catch (error) {
      console.error('Update online status error:', error);
      return {
        success: false,
        error: 'Failed to update online status'
      };
    }
  }

  /**
   * Get user privacy settings
   */
  static async getPrivacySettings(userId: string): Promise<ApiResponse> {
    try {
      // Validate user ID
      if (!ValidationUtils.isValidUUID(userId)) {
        return {
          success: false,
          error: 'Invalid user ID format'
        };
      }

      // Get privacy settings
      const settings = await UserRepository.getPrivacySettings(userId);

      if (!settings) {
        return {
          success: false,
          error: 'Privacy settings not found'
        };
      }

      // Convert to API format
      const apiSettings = UserConverter.toApiPrivacySettings(settings);

      return {
        success: true,
        data: apiSettings
      };

    } catch (error) {
      console.error('Get privacy settings error:', error);
      return {
        success: false,
        error: 'Failed to get privacy settings'
      };
    }
  }

  /**
   * Update user privacy settings
   */
  static async updatePrivacySettings(
    userId: string,
    updateData: Partial<PrivacySettings>
  ): Promise<ApiResponse> {
    try {
      // Validate user ID
      if (!ValidationUtils.isValidUUID(userId)) {
        return {
          success: false,
          error: 'Invalid user ID format'
        };
      }

      // Validate privacy settings data
      const validation = UserModel.validatePrivacySettings(updateData);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        };
      }

      // Update privacy settings
      const updatedSettings = await UserRepository.updatePrivacySettings(userId, validation.sanitizedData!);

      // Convert to API format
      const apiSettings = UserConverter.toApiPrivacySettings(updatedSettings);

      return {
        success: true,
        data: apiSettings,
        message: 'Privacy settings updated successfully'
      };

    } catch (error) {
      console.error('Update privacy settings error:', error);
      return {
        success: false,
        error: 'Failed to update privacy settings'
      };
    }
  }

  /**
   * Check if users are contacts
   */
  static async areUsersContacts(userId1: string, userId2: string): Promise<boolean> {
    try {
      // Validate user IDs
      if (!ValidationUtils.isValidUUID(userId1) || !ValidationUtils.isValidUUID(userId2)) {
        return false;
      }

      return await UserRepository.areUsersContacts(userId1, userId2);
    } catch (error) {
      console.error('Check contacts error:', error);
      return false;
    }
  }

  /**
   * Get user's contact list
   */
  static async getUserContacts(userId: string): Promise<ApiResponse> {
    try {
      // Validate user ID
      if (!ValidationUtils.isValidUUID(userId)) {
        return {
          success: false,
          error: 'Invalid user ID format'
        };
      }

      // Get contacts
      const contacts = await UserRepository.getUserContacts(userId);

      // Convert to API format with privacy filtering
      const apiContacts = contacts.map(contact => {
        const userWithPrivacy = UserConverter.toApiUserWithPrivacy(contact);
        // Contacts can see each other's information based on privacy settings
        return UserConverter.applyPrivacyFilter(userWithPrivacy, userId, true);
      });

      return {
        success: true,
        data: {
          contacts: apiContacts
        }
      };

    } catch (error) {
      console.error('Get user contacts error:', error);
      return {
        success: false,
        error: 'Failed to get contacts'
      };
    }
  }

  /**
   * Add a contact
   */
  static async addContact(userId: string, contactId: string): Promise<ApiResponse> {
    try {
      // Validate user IDs
      if (!ValidationUtils.isValidUUID(userId) || !ValidationUtils.isValidUUID(contactId)) {
        return {
          success: false,
          error: 'Invalid user ID format'
        };
      }

      // Check if trying to add self
      if (userId === contactId) {
        return {
          success: false,
          error: 'Cannot add yourself as a contact'
        };
      }

      // Check if contact user exists
      const contactUser = await UserRepository.findUserById(contactId);
      if (!contactUser) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Check if already contacts
      const areContacts = await UserRepository.areUsersContacts(userId, contactId);
      if (areContacts) {
        return {
          success: false,
          error: 'User is already in your contacts'
        };
      }

      // Check if user is blocked
      const isBlocked = await UserRepository.isUserBlocked(userId, contactId);
      const isBlockedBy = await UserRepository.isBlockedBy(userId, contactId);
      
      if (isBlocked || isBlockedBy) {
        return {
          success: false,
          error: 'Cannot add blocked user as contact'
        };
      }

      // Add contact
      await UserRepository.addContact(userId, contactId);

      // Get updated contact with privacy settings
      const updatedContact = await UserRepository.findUserByIdWithPrivacy(contactId);
      const apiContact = UserConverter.applyPrivacyFilter(
        UserConverter.toApiUserWithPrivacy(updatedContact!), 
        userId, 
        true
      );

      return {
        success: true,
        data: apiContact,
        message: 'Contact added successfully'
      };

    } catch (error) {
      console.error('Add contact error:', error);
      return {
        success: false,
        error: 'Failed to add contact'
      };
    }
  }

  /**
   * Remove a contact
   */
  static async removeContact(userId: string, contactId: string): Promise<ApiResponse> {
    try {
      // Validate user IDs
      if (!ValidationUtils.isValidUUID(userId) || !ValidationUtils.isValidUUID(contactId)) {
        return {
          success: false,
          error: 'Invalid user ID format'
        };
      }

      // Check if they are contacts
      const areContacts = await UserRepository.areUsersContacts(userId, contactId);
      if (!areContacts) {
        return {
          success: false,
          error: 'User is not in your contacts'
        };
      }

      // Remove contact
      await UserRepository.removeContact(userId, contactId);

      return {
        success: true,
        message: 'Contact removed successfully'
      };

    } catch (error) {
      console.error('Remove contact error:', error);
      return {
        success: false,
        error: 'Failed to remove contact'
      };
    }
  }

  /**
   * Block a user
   */
  static async blockUser(userId: string, blockedUserId: string): Promise<ApiResponse> {
    try {
      // Validate user IDs
      if (!ValidationUtils.isValidUUID(userId) || !ValidationUtils.isValidUUID(blockedUserId)) {
        return {
          success: false,
          error: 'Invalid user ID format'
        };
      }

      // Check if trying to block self
      if (userId === blockedUserId) {
        return {
          success: false,
          error: 'Cannot block yourself'
        };
      }

      // Check if user exists
      const userToBlock = await UserRepository.findUserById(blockedUserId);
      if (!userToBlock) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Check if already blocked
      const isBlocked = await UserRepository.isUserBlocked(userId, blockedUserId);
      if (isBlocked) {
        return {
          success: false,
          error: 'User is already blocked'
        };
      }

      // Remove from contacts if they are contacts
      const areContacts = await UserRepository.areUsersContacts(userId, blockedUserId);
      if (areContacts) {
        await UserRepository.removeContact(userId, blockedUserId);
      }

      // Block user
      await UserRepository.blockUser(userId, blockedUserId);

      return {
        success: true,
        message: 'User blocked successfully'
      };

    } catch (error) {
      console.error('Block user error:', error);
      return {
        success: false,
        error: 'Failed to block user'
      };
    }
  }

  /**
   * Unblock a user
   */
  static async unblockUser(userId: string, blockedUserId: string): Promise<ApiResponse> {
    try {
      // Validate user IDs
      if (!ValidationUtils.isValidUUID(userId) || !ValidationUtils.isValidUUID(blockedUserId)) {
        return {
          success: false,
          error: 'Invalid user ID format'
        };
      }

      // Check if user is blocked
      const isBlocked = await UserRepository.isUserBlocked(userId, blockedUserId);
      if (!isBlocked) {
        return {
          success: false,
          error: 'User is not blocked'
        };
      }

      // Unblock user
      await UserRepository.unblockUser(userId, blockedUserId);

      return {
        success: true,
        message: 'User unblocked successfully'
      };

    } catch (error) {
      console.error('Unblock user error:', error);
      return {
        success: false,
        error: 'Failed to unblock user'
      };
    }
  }

  /**
   * Get blocked users list
   */
  static async getBlockedUsers(userId: string): Promise<ApiResponse> {
    try {
      // Validate user ID
      if (!ValidationUtils.isValidUUID(userId)) {
        return {
          success: false,
          error: 'Invalid user ID format'
        };
      }

      // Get blocked users
      const blockedUsers = await UserRepository.getBlockedUsers(userId);

      // Convert to API format (minimal info for blocked users)
      const apiBlockedUsers = blockedUsers.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        isOnline: false, // Don't show online status for blocked users
        lastSeen: new Date(0), // Don't show last seen for blocked users
        createdAt: user.createdAt
      }));

      return {
        success: true,
        data: {
          blockedUsers: apiBlockedUsers
        }
      };

    } catch (error) {
      console.error('Get blocked users error:', error);
      return {
        success: false,
        error: 'Failed to get blocked users'
      };
    }
  }

  /**
   * Get mutual contacts between two users
   */
  static async getMutualContacts(userId: string, otherUserId: string): Promise<ApiResponse> {
    try {
      // Validate user IDs
      if (!ValidationUtils.isValidUUID(userId) || !ValidationUtils.isValidUUID(otherUserId)) {
        return {
          success: false,
          error: 'Invalid user ID format'
        };
      }

      // Get mutual contacts
      const mutualContacts = await UserRepository.getMutualContacts(userId, otherUserId);

      // Convert to API format
      const apiMutualContacts = mutualContacts.map(contact => 
        UserConverter.toApiUser(contact)
      );

      return {
        success: true,
        data: {
          mutualContacts: apiMutualContacts,
          count: apiMutualContacts.length
        }
      };

    } catch (error) {
      console.error('Get mutual contacts error:', error);
      return {
        success: false,
        error: 'Failed to get mutual contacts'
      };
    }
  }
}