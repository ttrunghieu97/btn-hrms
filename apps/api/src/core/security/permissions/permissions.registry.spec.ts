import { parsePermissionCode } from '../../../modules/identity/access-control/domain/permission-code';
import { PermissionHierarchyResolver } from './permission-hierarchy.resolver';
import { PERMISSION_CATALOG, Permissions } from './permissions.registry';

describe('Permissions catalog', () => {
  it('uses sys:all as the only super-admin permission', () => {
    expect(Permissions.SYS_ALL).toBe('sys:all');
    expect(Object.values(Permissions)).not.toContain('ALL');
  });

  it('contains employee base permissions with self scope only', () => {
    expect(Permissions.EMPLOYEES_VIEW_SELF).toBe('employee:view:self');
    expect(Permissions.EMPLOYEES_UPDATE_SELF_LIMITED).toBe('employee:update:self');
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

  it('expands employee:edit to employee:update:self, employee:view, and employee:create without broadening to employee:update:all or employee:view:all', () => {
    const resolver = new PermissionHierarchyResolver();

    const expandedFromEdit = resolver.expand(['employee:edit']);
    expect(expandedFromEdit).toEqual(
      expect.arrayContaining([
        'employee:edit',
        'employees:edit',
        'employee:update:self',
        'employees:update:self',
        'employee:view',
        'employees:view',
        'employee:create',
        'employees:create',
      ]),
    );
    expect(expandedFromEdit).not.toContain('employee:update:all');
    expect(expandedFromEdit).not.toContain('employees:update:all');
    expect(expandedFromEdit).not.toContain('employee:view:all');
    expect(expandedFromEdit).not.toContain('employees:view:all');
    expect(expandedFromEdit).not.toContain('employee:manage');

    const expandedDeptCombo = resolver.expand(['employee:edit', 'employee:view:department']);
    expect(expandedDeptCombo).toContain('employee:view:department');
    expect(expandedDeptCombo).toContain('employee:view:self');
    expect(expandedDeptCombo).toContain('employee:update:self');
    expect(expandedDeptCombo).not.toContain('employee:update:all');
    expect(expandedDeptCombo).not.toContain('employee:view:all');

    const expandedSelfCombo = resolver.expand(['employee:edit', 'employee:view:self']);
    expect(expandedSelfCombo).toContain('employee:view:self');
    expect(expandedSelfCombo).toContain('employee:update:self');
    expect(expandedSelfCombo).not.toContain('employee:update:all');
    expect(expandedSelfCombo).not.toContain('employee:view:all');
    expect(expandedSelfCombo).not.toContain('employee:view:department');
  });
});

