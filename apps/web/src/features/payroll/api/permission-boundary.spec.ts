import { hasPermission } from '@/lib/rbac';

describe('payroll permission boundary', () => {
  it('grants view:self to employee', () => {
    expect(hasPermission({ permissions: ['payroll:view:self'] }, 'payroll:view:self')).toBe(true);
  });

  it('denies view:all to self-only user', () => {
    expect(hasPermission({ permissions: ['payroll:view:self'] }, 'payroll:view:all')).toBe(false);
  });

  it('grants manage to payroll admin', () => {
    expect(hasPermission({ permissions: ['payroll:manage'] }, 'payroll:manage')).toBe(true);
  });

  it('manage implies view', () => {
    expect(hasPermission({ permissions: ['payroll:manage'] }, 'payroll:view')).toBe(true);
  });

  it('super admin has all permissions', () => {
    const user = { permissions: ['ALL'] };
    expect(hasPermission(user, 'payroll:manage')).toBe(true);
    expect(hasPermission(user, 'payroll:view:all')).toBe(true);
    expect(hasPermission(user, 'payroll:run')).toBe(true);
  });

  it('denies access with no permissions', () => {
    expect(hasPermission(null, 'payroll:view:self')).toBe(false);
    expect(hasPermission(undefined, 'payroll:view:self')).toBe(false);
  });
});
