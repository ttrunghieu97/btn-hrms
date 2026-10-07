import { hasPermission, type PermissionedUser } from '@/lib/rbac';
import { permissions } from '@/lib/permissions';

function makeUser(overrides: Partial<PermissionedUser> = {}): PermissionedUser {
  return {
    permissions: [],
    ...overrides,
  };
}

describe('employee permission boundary', () => {
  describe('view permissions', () => {
    it('grants view:self to user with own scope', () => {
      const user = makeUser({ permissions: ['employees:view:self'] });
      expect(hasPermission(user, permissions.employees.viewSelf)).toBe(true);
    });

    it('grants view:all when user has view:all permission', () => {
      const user = makeUser({ permissions: ['employees:view:all'] });
      expect(hasPermission(user, permissions.employees.viewAll)).toBe(true);
    });

    it('denies view:all to self-only user', () => {
      const user = makeUser({ permissions: ['employees:view:self'] });
      expect(hasPermission(user, permissions.employees.viewAll)).toBe(false);
    });

    it('grants everything to super admin', () => {
      const user = makeUser({ permissions: ['ALL'] });
      expect(hasPermission(user, permissions.employees.viewAll)).toBe(true);
      expect(hasPermission(user, permissions.employees.edit)).toBe(true);
      expect(hasPermission(user, permissions.employees.create)).toBe(true);
    });

    it('returns false for null user', () => {
      expect(hasPermission(null, permissions.employees.view)).toBe(false);
    });

    it('returns false for undefined user', () => {
      expect(hasPermission(undefined, permissions.employees.view)).toBe(false);
    });
  });

  describe('mutation permissions', () => {
    it('grants create to authorized user', () => {
      const user = makeUser({ permissions: ['employees:create'] });
      expect(hasPermission(user, permissions.employees.create)).toBe(true);
    });

    it('denies edit to viewer-only user', () => {
      const user = makeUser({ permissions: ['employees:view:self'] });
      expect(hasPermission(user, permissions.employees.edit)).toBe(false);
    });

    it('grants reset-password to authorized admin', () => {
      const user = makeUser({ permissions: ['employees:reset-password'] });
      expect(hasPermission(user, permissions.employees.resetPassword)).toBe(true);
    });
  });

  describe(':view shortcut (:manage implies :view)', () => {
    it('grants view when user has manage', () => {
      const user = makeUser({ permissions: ['employees:manage'] });
      expect(hasPermission(user, permissions.employees.view)).toBe(true);
    });
  });
});
