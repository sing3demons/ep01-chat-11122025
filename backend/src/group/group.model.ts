import { ValidationUtils } from '../utils/validation';
import { USER_ROLES } from '../config/constants';

/**
 * Group model interfaces and validation
 */

export interface Group {
  id: string;
  name: string;
  type: 'group';
  createdBy: string;
  createdAt: Date;
  lastMessageAt: Date;
  memberCount: number;
  members: GroupMember[];
  lastMessage?: {
    id: string;
    content: string;
    senderId: string;
    senderUsername: string;
    createdAt: Date;
  };
}

export interface GroupMember {
  groupId: string;
  userId: string;
  role: GroupRole;
  joinedAt: Date;
  user?: {
    id: string;
    username: string;
    isOnline: boolean;
    lastSeen: Date;
  };
}

export type GroupRole = 'admin' | 'member';

export interface CreateGroupData {
  name: string;
  createdBy: string;
  participantIds: string[];
}

export interface UpdateGroupData {
  name?: string;
}

export interface GroupMemberData {
  userId: string;
  role?: GroupRole;
}

export interface UpdateGroupMemberData {
  role?: GroupRole;
}

export interface GroupValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData?: any;
}

/**
 * Group model validation functions
 */
export class GroupModel {
  /**
   * Validate group creation data
   */
  static validateCreateGroup(data: CreateGroupData): GroupValidationResult {
    const errors: string[] = [];
    const sanitizedData: Partial<CreateGroupData> = {};

    // Validate name
    if (!data.name) {
      errors.push('Group name is required');
    } else {
      const nameValidation = ValidationUtils.isValidGroupName(data.name);
      if (!nameValidation.isValid) {
        errors.push(...nameValidation.errors);
      } else {
        sanitizedData.name = ValidationUtils.sanitizeString(data.name);
      }
    }

    // Validate createdBy
    if (!data.createdBy) {
      errors.push('Creator ID is required');
    } else if (!ValidationUtils.isValidUUID(data.createdBy)) {
      errors.push('Invalid creator ID format');
    } else {
      sanitizedData.createdBy = data.createdBy;
    }

    // Validate participantIds
    if (!data.participantIds || !Array.isArray(data.participantIds)) {
      errors.push('Participant IDs must be an array');
    } else if (data.participantIds.length < 2) {
      errors.push('Group must have at least 2 participants (including creator)');
    } else if (data.participantIds.length > 256) {
      errors.push('Group cannot have more than 256 participants');
    } else {
      const invalidIds = data.participantIds.filter(id => !ValidationUtils.isValidUUID(id));
      if (invalidIds.length > 0) {
        errors.push('All participant IDs must be valid UUIDs');
      } else {
        // Remove duplicates and ensure creator is included
        const uniqueParticipants = Array.from(new Set([data.createdBy, ...data.participantIds]));
        sanitizedData.participantIds = uniqueParticipants;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? sanitizedData as CreateGroupData : undefined,
    };
  }

  /**
   * Validate group update data
   */
  static validateUpdateGroup(data: UpdateGroupData): GroupValidationResult {
    const errors: string[] = [];
    const sanitizedData: Partial<UpdateGroupData> = {};

    // Validate name if provided
    if (data.name !== undefined) {
      if (data.name === null || data.name === '') {
        errors.push('Group name cannot be empty');
      } else {
        const nameValidation = ValidationUtils.isValidGroupName(data.name);
        if (!nameValidation.isValid) {
          errors.push(...nameValidation.errors);
        } else {
          sanitizedData.name = ValidationUtils.sanitizeString(data.name);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? sanitizedData : undefined,
    };
  }

  /**
   * Validate group member data
   */
  static validateGroupMember(data: GroupMemberData): GroupValidationResult {
    const errors: string[] = [];
    const sanitizedData: Partial<GroupMemberData> = {};

    // Validate userId
    if (!data.userId) {
      errors.push('User ID is required');
    } else if (!ValidationUtils.isValidUUID(data.userId)) {
      errors.push('Invalid user ID format');
    } else {
      sanitizedData.userId = data.userId;
    }

    // Validate role if provided
    if (data.role !== undefined) {
      if (!Object.values(USER_ROLES).includes(data.role as any)) {
        errors.push(`Invalid role. Must be one of: ${Object.values(USER_ROLES).join(', ')}`);
      } else {
        sanitizedData.role = data.role;
      }
    } else {
      sanitizedData.role = USER_ROLES.MEMBER; // Default role
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? sanitizedData as GroupMemberData : undefined,
    };
  }

  /**
   * Validate group member update data
   */
  static validateUpdateGroupMember(data: UpdateGroupMemberData): GroupValidationResult {
    const errors: string[] = [];
    const sanitizedData: Partial<UpdateGroupMemberData> = {};

    // Validate role if provided
    if (data.role !== undefined) {
      if (!Object.values(USER_ROLES).includes(data.role as any)) {
        errors.push(`Invalid role. Must be one of: ${Object.values(USER_ROLES).join(', ')}`);
      } else {
        sanitizedData.role = data.role;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? sanitizedData : undefined,
    };
  }

  /**
   * Check if user has admin privileges in group
   */
  static isAdmin(members: GroupMember[], userId: string): boolean {
    const member = members.find(m => m.userId === userId);
    return member?.role === USER_ROLES.ADMIN;
  }

  /**
   * Check if user is member of group
   */
  static isMember(members: GroupMember[], userId: string): boolean {
    return members.some(m => m.userId === userId);
  }

  /**
   * Get admin count in group
   */
  static getAdminCount(members: GroupMember[]): number {
    return members.filter(m => m.role === USER_ROLES.ADMIN).length;
  }

  /**
   * Check if group can have member removed (must have at least one admin)
   */
  static canRemoveMember(members: GroupMember[], userIdToRemove: string): boolean {
    const member = members.find(m => m.userId === userIdToRemove);
    if (!member) {
      return false; // User is not a member
    }

    // If removing an admin, ensure at least one admin remains
    if (member.role === USER_ROLES.ADMIN) {
      const adminCount = this.getAdminCount(members);
      return adminCount > 1;
    }

    return true; // Can always remove non-admin members
  }

  /**
   * Validate group member limits
   */
  static validateMemberLimits(currentMemberCount: number, newMembersCount: number = 1): GroupValidationResult {
    const errors: string[] = [];

    if (currentMemberCount + newMembersCount > 256) {
      errors.push('Group cannot have more than 256 members');
    }

    if (currentMemberCount + newMembersCount < 2) {
      errors.push('Group must have at least 2 members');
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: undefined
    };
  }

  /**
   * Validate group permissions for action
   */
  static validateGroupPermissions(
    members: GroupMember[], 
    userId: string, 
    action: 'add_member' | 'remove_member' | 'update_role' | 'update_group' | 'delete_group'
  ): GroupValidationResult {
    const errors: string[] = [];
    const member = members.find(m => m.userId === userId);

    if (!member) {
      errors.push('User is not a member of this group');
      return { isValid: false, errors, sanitizedData: undefined };
    }

    switch (action) {
      case 'add_member':
      case 'remove_member':
      case 'update_role':
      case 'update_group':
      case 'delete_group':
        if (member.role !== USER_ROLES.ADMIN) {
          errors.push('Only group admins can perform this action');
        }
        break;
      default:
        errors.push('Invalid action specified');
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: undefined
    };
  }

  /**
   * Generate group display summary
   */
  static generateGroupSummary(group: Group): string {
    const memberCount = group.memberCount;
    const adminCount = group.members.filter(m => m.role === USER_ROLES.ADMIN).length;
    
    return `${group.name} (${memberCount} members, ${adminCount} admins)`;
  }

  /**
   * Check if group name is unique (placeholder for future implementation)
   */
  static async isGroupNameUnique(name: string, excludeGroupId?: string): Promise<boolean> {
    // TODO: Implement group name uniqueness check if required
    // For now, group names don't need to be globally unique
    return true;
  }

  /**
   * Validate group activity permissions
   */
  static canPerformAction(
    members: GroupMember[], 
    userId: string, 
    targetUserId: string, 
    action: 'promote' | 'demote' | 'remove'
  ): boolean {
    const actor = members.find(m => m.userId === userId);
    const target = members.find(m => m.userId === targetUserId);

    if (!actor || !target) {
      return false;
    }

    // Only admins can perform these actions
    if (actor.role !== USER_ROLES.ADMIN) {
      return false;
    }

    // Special case: if demoting an admin, ensure at least one admin remains
    if (action === 'demote' && target.role === USER_ROLES.ADMIN) {
      const adminCount = this.getAdminCount(members);
      return adminCount > 1;
    }

    // Special case: if removing an admin, ensure at least one admin remains
    if (action === 'remove' && target.role === USER_ROLES.ADMIN) {
      const adminCount = this.getAdminCount(members);
      return adminCount > 1;
    }

    return true;
  }

  /**
   * Get member role display name
   */
  static getRoleDisplayName(role: GroupRole): string {
    switch (role) {
      case USER_ROLES.ADMIN:
        return 'Admin';
      case USER_ROLES.MEMBER:
        return 'Member';
      default:
        return 'Unknown';
    }
  }

  /**
   * Sort members by role and join date
   */
  static sortMembers(members: GroupMember[]): GroupMember[] {
    return members.sort((a, b) => {
      // Admins first
      if (a.role === USER_ROLES.ADMIN && b.role !== USER_ROLES.ADMIN) {
        return -1;
      }
      if (b.role === USER_ROLES.ADMIN && a.role !== USER_ROLES.ADMIN) {
        return 1;
      }
      
      // Then by join date (earliest first)
      return a.joinedAt.getTime() - b.joinedAt.getTime();
    });
  }
}