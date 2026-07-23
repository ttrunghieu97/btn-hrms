/**
 * Leave permission boundary tests.
 */
import { hasPermission, type PermissionedUser } from '@/lib/rbac';
import { permissions } from '@/lib/permissions';

function makeUser(overrides: Partial<PermissionedUser> = {}): PermissionedUser {
  return { permissions: [], ...overrides };
}

describe('leave permission boundary', () => {
  describe('employee scope', () => {
    it('grants view:self to employee', () => {
      const user = makeUser({ permissions: ['leave:view:self'] });
      expect(hasPermission(user, 'leave:view:self')).toBe(true);
    });

    it('denies view:all to self-only user', () => {
      const user = makeUser({ permissions: ['leave:view:self'] });
      expect(hasPermission(user, 'leave:view:all')).toBe(false);
    });

    it('grants create to authenticated user', () => {
      const user = makeUser({ permissions: ['leave:create'] });
      expect(hasPermission(user, 'leave:create')).toBe(true);
    });

    it('denies approve without permission', () => {
      const user = makeUser({ permissions: ['leave:create'] });
      expect(hasPermission(user, 'leave:approve')).toBe(false);
    });
  });

  describe('manager scope', () => {
    it('grants approve to manager', () => {
      const user = makeUser({ permissions: ['leave:approve'] });
      expect(hasPermission(user, 'leave:approve')).toBe(true);
    });

    it('denies admin actions to manager', () => {
      const user = makeUser({ permissions: ['leave:approve'] });
      expect(hasPermission(user, 'leave:manage')).toBe(false);
    });
  });

  describe('admin scope', () => {
    it('grants manage to admin', () => {
      const user = makeUser({ permissions: ['leave:manage'] });
      expect(hasPermission(user, 'leave:manage')).toBe(true);
    });

    it('manage implies view', () => {
      const user = makeUser({ permissions: ['leave:manage'] });
      expect(hasPermission(user, 'leave:view')).toBe(true);
    });
  });

  describe('super admin', () => {
    it('has all leave permissions', () => {
      const user = makeUser({ permissions: ['ALL'] });
      expect(hasPermission(user, 'leave:view:self')).toBe(true);
      expect(hasPermission(user, 'leave:approve')).toBe(true);
      expect(hasPermission(user, 'leave:manage')).toBe(true);
    });
  });

  describe('leave balance', () => {
    it('grants balance view to employee', () => {
      const user = makeUser({ permissions: ['leave:view:self'] });
      expect(hasPermission(user, 'leave:view:self')).toBe(true);
    });
  });
});
