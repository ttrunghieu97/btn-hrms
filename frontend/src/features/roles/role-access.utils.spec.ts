import { canEditRole, requiresExceptionGrantFields } from './role-access.utils';

describe('role access UI rules', () => {
  it('makes system admin role read-only and other roles editable', () => {
    expect(canEditRole({ code: 'system_admin' })).toBe(false);
    expect(canEditRole({ code: 'employee_base' })).toBe(true);
    expect(canEditRole({ type: 'custom' })).toBe(true);
  });

  it('requires reason and expiry for exception grants', () => {
    expect(requiresExceptionGrantFields()).toEqual(['reason', 'expiresAt']);
  });
});
