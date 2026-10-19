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

  describe('singular/plural alias parity & lifecycle action boundaries', () => {
    it('resolves singular employee:* and plural employees:* aliases identically', () => {
      const singularUser = makeUser({
        permissions: ['employee:view:department', 'employee:update:all', 'employee:manage:sensitive'],
      });
      const pluralUser = makeUser({
        permissions: ['employees:view:department', 'employees:edit', 'employees:manage:sensitive'],
      });

      expect(hasPermission(singularUser, permissions.employees.viewDepartment)).toBe(true);
      expect(hasPermission(pluralUser, permissions.employees.viewDepartment)).toBe(true);
      expect(hasPermission(singularUser, permissions.employees.edit)).toBe(true);
      expect(hasPermission(pluralUser, permissions.employees.edit)).toBe(true);
      expect(hasPermission(singularUser, permissions.employees.manageSensitive)).toBe(true);
      expect(hasPermission(pluralUser, permissions.employees.manageSensitive)).toBe(true);
    });

    it('restricts rehire and transfer initiation/cancellation to employee:manage', () => {
      const hrEditor = makeUser({ permissions: ['employee:edit'] });
      const hrManager = makeUser({ permissions: ['employee:manage'] });

      expect(hasPermission(hrEditor, permissions.employees.edit)).toBe(true);
      expect(hasPermission(hrEditor, permissions.employees.manage)).toBe(false);
      expect(hasPermission(hrManager, permissions.employees.manage)).toBe(true);
    });

    it('restricts scheduled termination to employee:manage or employee:manage:sensitive', () => {
      const hrEditor = makeUser({ permissions: ['employee:edit'] });
      const sensitiveAdmin = makeUser({ permissions: ['employee:manage:sensitive'] });

      expect(
        hasPermission(hrEditor, permissions.employees.manage) ||
          hasPermission(hrEditor, permissions.employees.manageSensitive),
      ).toBe(false);
      expect(
        hasPermission(sensitiveAdmin, permissions.employees.manage) ||
          hasPermission(sensitiveAdmin, permissions.employees.manageSensitive),
      ).toBe(true);
    });

    it('ensures employee:edit implies employee:update:self but NEVER implies employee:update:all or employee:view:all', () => {
      const deptEditor = makeUser({
        permissions: ['employee:view:department', 'employee:edit'],
      });
      const selfEditor = makeUser({
        permissions: ['employee:view:self', 'employee:edit'],
      });
      const globalEditor = makeUser({
        permissions: ['employee:update:all'],
      });

      expect(hasPermission(deptEditor, permissions.employees.edit)).toBe(true);
      expect(hasPermission(deptEditor, permissions.employees.updateSelf)).toBe(true);
      expect(hasPermission(deptEditor, permissions.employees.viewDepartment)).toBe(true);
      expect(hasPermission(deptEditor, permissions.employees.updateAll)).toBe(false);
      expect(hasPermission(deptEditor, permissions.employees.viewAll)).toBe(false);
      expect(hasPermission(deptEditor, permissions.employees.manage)).toBe(false);

      expect(hasPermission(selfEditor, permissions.employees.viewSelf)).toBe(true);
      expect(hasPermission(selfEditor, permissions.employees.viewDepartment)).toBe(false);
      expect(hasPermission(selfEditor, permissions.employees.viewAll)).toBe(false);
      expect(hasPermission(selfEditor, permissions.employees.updateAll)).toBe(false);

      expect(hasPermission(globalEditor, permissions.employees.updateAll)).toBe(true);
      expect(hasPermission(globalEditor, permissions.employees.edit)).toBe(true);
      expect(hasPermission(globalEditor, permissions.employees.updateSelf)).toBe(true);
    });
  });
});
