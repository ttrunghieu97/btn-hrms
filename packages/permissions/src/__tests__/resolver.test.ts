import { describe, it, expect } from 'vitest';
import { hasPermission, hasAnyPermission, hasAllPermissions, resolvePermissions } from '../utils';
import { PermissionRegistry } from '../registry/registry';

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

  // ── sys:all root permission ──────────────────────────────────────────

  it('sys:all grants any permission via hierarchy', () => {
    expect(hasPermission(['sys:all'], 'dashboard:view')).toBe(true);
    expect(hasPermission(['sys:all'], 'employee:view:self')).toBe(true);
    expect(hasPermission(['sys:all'], 'attendance:view:self')).toBe(true);
    expect(hasPermission(['sys:all'], 'payroll:view:all')).toBe(true);
    expect(hasPermission(['sys:all'], 'nonexistent:perm')).toBe(true);
  });

  it('sys:all works alongside other permissions', () => {
    expect(hasPermission(['sys:all', 'employee:view'], 'attendance:view:self')).toBe(true);
  });
});

// ── Regression: sys:all grants EVERY registered permission ─────────────
describe('sys:all root permission invariant', () => {
  // Flatten PermissionRegistry to get all known permission codes
  const allPermissionCodes = Object.values(PermissionRegistry).flatMap(
    (domain: Record<string, string>) => Object.values(domain),
  );

  it.each(allPermissionCodes)('sys:all grants %s', (code: string) => {
    expect(hasPermission(['sys:all'], code)).toBe(true);
  });

  it('sys:all grants any imaginable future permission code', () => {
    expect(hasPermission(['sys:all'], 'future-module:create')).toBe(true);
    expect(hasPermission(['sys:all'], 'hr:report:view:all')).toBe(true);
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

  it('sys:all passes hasAnyPermission', () => {
    expect(hasAnyPermission(['sys:all'], ['nonexistent:perm', 'also:missing'])).toBe(true);
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

  it('sys:all passes hasAllPermissions', () => {
    expect(hasAllPermissions(['sys:all'], ['attendance:view:self', 'leave:view:self', 'payroll:view:all'])).toBe(true);
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

  it('sys:all resolvePermissions returns sys:all', () => {
    const resolved = resolvePermissions(['sys:all']);
    expect(resolved).toContain('sys:all');
  });
});
