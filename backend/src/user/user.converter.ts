import { 
  User as PrismaUser, 
  PrivacySettings as PrismaPrivacySettings 
} from '@prisma/client';

import { 
  User, 
  UserWithPrivacy, 
  PrivacySettings 
} from './user.model';

/**
 * User model converters
 */
export class UserConverter {
  /**
   * Convert Prisma User to API User (removes sensitive data)
   */
  static toApiUser(prismaUser: PrismaUser): User {
    return {
      id: prismaUser.id,
      username: prismaUser.username,
      email: prismaUser.email,
      isOnline: prismaUser.isOnline,
      lastSeen: prismaUser.lastSeen,
      createdAt: prismaUser.createdAt,
    };
  }

  /**
   * Convert Prisma User with privacy settings to API format
   */
  static toApiUserWithPrivacy(
    prismaUser: PrismaUser & { privacySettings?: PrismaPrivacySettings | null }
  ): UserWithPrivacy {
    const user = this.toApiUser(prismaUser);
    
    return {
      ...user,
      privacySettings: prismaUser.privacySettings 
        ? this.toApiPrivacySettings(prismaUser.privacySettings)
        : undefined,
    };
  }

  /**
   * Convert Prisma PrivacySettings to API format
   */
  static toApiPrivacySettings(prismaSettings: PrismaPrivacySettings): PrivacySettings {
    return {
      userId: prismaSettings.userId,
      showOnlineStatus: prismaSettings.showOnlineStatus,
      showLastSeen: prismaSettings.showLastSeen,
      allowContactsOnly: prismaSettings.allowContactsOnly,
      updatedAt: prismaSettings.updatedAt,
    };
  }

  /**
   * Convert API User to Prisma User format (for database operations)
   */
  static toPrismaUser(apiUser: User, passwordHash?: string): Omit<PrismaUser, 'id'> {
    return {
      username: apiUser.username,
      email: apiUser.email,
      passwordHash: passwordHash || '',
      isOnline: apiUser.isOnline,
      lastSeen: apiUser.lastSeen,
      createdAt: apiUser.createdAt,
    };
  }

  /**
   * Apply privacy settings to user data based on viewer's relationship
   */
  static applyPrivacyFilter(
    user: UserWithPrivacy, 
    viewerId: string, 
    isContact: boolean = false
  ): User {
    const baseUser: User = {
      id: user.id,
      username: user.username,
      email: user.email,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen,
      createdAt: user.createdAt,
    };

    // If viewing own profile, return all data
    if (user.id === viewerId) {
      return baseUser;
    }

    const privacy = user.privacySettings;
    if (!privacy) {
      return baseUser; // No privacy settings, show all
    }

    // Apply privacy filters
    if (!privacy.showOnlineStatus) {
      baseUser.isOnline = false;
    }

    if (!privacy.showLastSeen) {
      baseUser.lastSeen = new Date(0); // Epoch time to indicate hidden
    }

    // If user only allows contacts and viewer is not a contact, hide more info
    if (privacy.allowContactsOnly && !isContact) {
      baseUser.isOnline = false;
      baseUser.lastSeen = new Date(0);
    }

    return baseUser;
  }
}