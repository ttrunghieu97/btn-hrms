import { canAccessRoute, resolveRoutePermission } from '../utils/route-resolver';

describe('resolveRoutePermission', () => {
  it('returns rule for known route', () => {
    const rule = resolveRoutePermission('/employees');
    expect(rule).not.toBeNull();
    expect(rule?.anyOf).toContain('employee:view');
  });

  it('returns null for unknown route', () => {
    expect(resolveRoutePermission('/unknown')).toBeNull();
  });

  it('matches dynamic route', () => {
    const rule = resolveRoutePermission('/employees/42');
    expect(rule).not.toBeNull();
  });
});

describe('canAccessRoute', () => {
  const user = (permissions: string[]) => ({ permissions });
  const admin = { isSuperAdmin: true, permissions: [] };

  it('allows access when user has required permission', () => {
    expect(canAccessRoute('/employees', user(['employee:view']))).toBe(true);
  });

  it('denies access when user lacks permission', () => {
    expect(canAccessRoute('/employees', user(['attendance:view:self']))).toBe(false);
  });

  it('allows super admin', () => {
    expect(canAccessRoute('/employees', admin)).toBe(true);
  });

  it('allows unknown routes', () => {
    expect(canAccessRoute('/unknown', user([]))).toBe(true);
  });

  it('allows route with empty rule (no-permissions page)', () => {
    expect(canAccessRoute('/account/no-permissions', user([]))).toBe(true);
  });
});
