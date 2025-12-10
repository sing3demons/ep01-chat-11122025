import { GroupService } from '../group.service';
import { GroupModel } from '../group.model';

describe('GroupService', () => {
  describe('validateCreateGroup', () => {
    it('should validate group creation data correctly', () => {
      const validData = {
        name: 'Test Group',
        createdBy: '123e4567-e89b-12d3-a456-426614174000',
        participantIds: ['123e4567-e89b-12d3-a456-426614174001', '123e4567-e89b-12d3-a456-426614174002']
      };

      const result = GroupModel.validateCreateGroup(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid group data', () => {
      const invalidData = {
        name: '',
        createdBy: 'invalid-uuid',
        participantIds: []
      };

      const result = GroupModel.validateCreateGroup(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});