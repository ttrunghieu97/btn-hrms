import { SYSTEM_ROLES } from './seed';

describe('system roles seed', () => {
  it('defines enterprise system roles', () => {
    expect(SYSTEM_ROLES.map((role: any) => role.code)).toEqual([
      'employee_base',
      'system_admin',
    ]);
  });

  it('employee_base only contains self-scoped baseline permissions', () => {
    const employeeBase = SYSTEM_ROLES.find((role: any) => role.code === 'employee_base');
    expect(employeeBase?.permissions).toEqual(expect.arrayContaining([
      'employees:view:self',
      'employees:update:self',
    ]));
    expect(employeeBase?.permissions).not.toContain('employees:view:all');
    expect(employeeBase?.permissions).not.toContain('employees:manage:sensitive');
  });

  it('system_admin contains only sys:all as global override', () => {
    const systemAdmin = SYSTEM_ROLES.find((role: any) => role.code === 'system_admin');
    expect(systemAdmin?.permissions).toEqual(['sys:all']);
  });
});
