import { parsePermissionCode } from '../../../modules/identity/access-control/domain/permission-code';
import { PERMISSION_CATALOG, Permissions } from './permissions.registry';

describe('Permissions catalog', () => {
  it('uses sys:all as the only super-admin permission', () => {
    expect(Permissions.SYS_ALL).toBe('sys:all');
    expect(Object.values(Permissions)).not.toContain('ALL');
  });

  it('contains employee base permissions with self scope only', () => {
    expect(Permissions.EMPLOYEES_VIEW_SELF).toBe('employees:view:self');
    expect(Permissions.EMPLOYEES_UPDATE_SELF_LIMITED).toBe('employees:update:self');
  });

  it('contains parseable catalog entries', () => {
    for (const permission of PERMISSION_CATALOG) {
      expect(parsePermissionCode(permission.code)).toEqual(
        expect.objectContaining({
          domain: permission.domain,
          action: permission.action,
        }),
      );
    }
  });
});
