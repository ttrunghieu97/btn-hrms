import { describe, it, expect } from 'vitest';
import { hasPermission, hasAnyPermission, hasAllPermissions, resolvePermissions } from '../utils';

describe('hasPermission (hierarchy-aware)', () => {
  it('returns true on direct match', () => {
    expect(hasPermission(['attendance:view:self'], 'attendance:view:self')).toBe(true);
  });

  it('returns true when user has broader scope via hierarchy', () => {
    expect(hasPermission(['attendance:view:all'], 'attendance:view:self')).toBe(true);
    expect(hasPermission(['attendance:view:department'], 'attendance:view:self')).toBe(true);
  });

  it('returns true for middle scope from top', () => {
    expect(hasPermission(['attendance:view:all'], 'attendance:view:department')).toBe(true);
  });

  it('returns false when user has narrower scope', () => {
    expect(hasPermission(['attendance:view:self'], 'attendance:view:all')).toBe(false);
  });

  it('returns false for missing permission', () => {
    expect(hasPermission(['attendance:view:self'], 'attendance:check')).toBe(false);
  });

  it('returns true for super admin', () => {
    expect(hasPermission([], 'attendance:view:self', true)).toBe(true);
  });

  it('returns false for null/undefined permissions', () => {
    expect(hasPermission(null, 'attendance:view:self')).toBe(false);
    expect(hasPermission(undefined, 'attendance:view:self')).toBe(false);
  });

  it('returns false for empty permissions', () => {
    expect(hasPermission([], 'attendance:view:self')).toBe(false);
  });

  it('handles leave hierarchy', () => {
    expect(hasPermission(['leave:view:all'], 'leave:view:self')).toBe(true);
    expect(hasPermission(['leave:view:self'], 'leave:view:all')).toBe(false);
  });

  it('handles payroll hierarchy', () => {
    expect(hasPermission(['payroll:view:all'], 'payroll:view:self')).toBe(true);
  });

  it('handles schedule hierarchy', () => {
    expect(hasPermission(['schedule:view:all'], 'schedule:view:self')).toBe(true);
    expect(hasPermission(['schedule:edit:all'], 'schedule:edit:self')).toBe(true);
  });

  it('handles task hierarchy', () => {
    expect(hasPermission(['tasks:view'], 'tasks:view:self')).toBe(true);
    expect(hasPermission(['tasks:view:self'], 'tasks:view')).toBe(false);
  });

  it('does not cross domain hierarchies', () => {
    expect(hasPermission(['attendance:view:all'], 'leave:view:self')).toBe(false);
  });
});

describe('hasAnyPermission', () => {
  it('returns true when any matches', () => {
    expect(hasAnyPermission(
      ['attendance:view:self'],
      ['leave:view:self', 'attendance:view:self'],
    )).toBe(true);
  });

  it('returns false when none match', () => {
    expect(hasAnyPermission(
      ['attendance:view:self'],
      ['leave:view:self', 'payroll:view:self'],
    )).toBe(false);
  });

  it('respects hierarchy', () => {
    expect(hasAnyPermission(
      ['attendance:view:all'],
      ['leave:view:self', 'attendance:view:self'],
    )).toBe(true);
  });
});

describe('hasAllPermissions', () => {
  it('returns true when all match', () => {
    expect(hasAllPermissions(
      ['attendance:view:self', 'leave:view:self'],
      ['attendance:view:self', 'leave:view:self'],
    )).toBe(true);
  });

  it('returns false when one missing', () => {
    expect(hasAllPermissions(
      ['attendance:view:self'],
      ['attendance:view:self', 'leave:view:self'],
    )).toBe(false);
  });
});

describe('resolvePermissions', () => {
  it('expands scoped permissions upward', () => {
    const resolved = resolvePermissions(['attendance:view:self']);
    expect(resolved).toContain('attendance:view:self');
    expect(resolved).toContain('attendance:view:department');
    expect(resolved).toContain('attendance:view:all');
  });

  it('does not cross domains', () => {
    const resolved = resolvePermissions(['attendance:view:self']);
    expect(resolved).not.toContain('leave:view:self');
  });

  it('returns empty for null/undefined', () => {
    expect(resolvePermissions(null)).toEqual([]);
    expect(resolvePermissions(undefined)).toEqual([]);
  });
});
