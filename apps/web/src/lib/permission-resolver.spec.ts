import { can, ruleLabel } from './permission-resolver';

const adminUser = { isSuperAdmin: true, permissions: [] };
const attendAllUser = { permissions: ['attendance:view:all'] };
const attendSelfUser = { permissions: ['attendance:view:self'] };
const leaveSelfUser = { permissions: ['leave:view:self'] };
const emptyUser = { permissions: [] };
const nullUser = null;

describe('can (compound checker)', () => {
  describe('anyOf', () => {
    it('returns true when user has one of the required permissions', () => {
      expect(can(attendSelfUser, { anyOf: ['attendance:view:self', 'attendance:view:all'] })).toBe(true);
    });

    it('returns false when user has none of the required permissions', () => {
      expect(can(attendSelfUser, { anyOf: ['leave:view:self', 'payroll:view:self'] })).toBe(false);
    });

    it('respects hierarchy (broader scope qualifies)', () => {
      expect(can(attendAllUser, { anyOf: ['attendance:view:self'] })).toBe(true);
    });

    it('returns false for empty permissions', () => {
      expect(can(emptyUser, { anyOf: ['attendance:view:self'] })).toBe(false);
    });

    it('returns false for null user with anyOf', () => {
      expect(can(nullUser, { anyOf: [] })).toBe(false);
    });
  });

  describe('allOf', () => {
    it('returns true when user has all required permissions', () => {
      const user = { permissions: ['attendance:view:self', 'leave:view:self'] };
      expect(can(user, { allOf: ['attendance:view:self', 'leave:view:self'] })).toBe(true);
    });

    it('returns false when user misses one', () => {
      expect(can(attendSelfUser, { allOf: ['attendance:view:self', 'leave:view:self'] })).toBe(false);
    });

    it('respects hierarchy', () => {
      expect(can(attendAllUser, { allOf: ['attendance:view:self', 'attendance:view:department'] })).toBe(true);
    });
  });

  describe('not', () => {
    it('returns false when user has a negated permission', () => {
      expect(can(leaveSelfUser, { not: ['leave:view:self'] })).toBe(false);
    });

    it('returns true when user lacks the negated permission', () => {
      expect(can(attendSelfUser, { not: ['leave:view:self'] })).toBe(true);
    });

    it('works with anyOf', () => {
      expect(can(
        { permissions: ['attendance:view:self'] },
        { anyOf: ['attendance:view:self'], not: ['leave:view:self'] },
      )).toBe(true);
    });

    it('not overrides anyOf', () => {
      expect(can(
        { permissions: ['attendance:view:self', 'leave:view:self'] },
        { anyOf: ['attendance:view:self'], not: ['leave:view:self'] },
      )).toBe(false);
    });
  });

  describe('super admin bypass', () => {
    it('bypasses all checks for super admin', () => {
      expect(can(adminUser, { anyOf: ['nonexistent:perm'] })).toBe(true);
      expect(can(adminUser, { allOf: ['nonexistent:perm', 'another:missing'] })).toBe(true);
    });

    it('bypasses not-check for super admin', () => {
      expect(can(adminUser, { not: ['anything'] })).toBe(true);
    });
  });

  describe('null/undefined user', () => {
    it('returns false for null user with anyOf', () => {
      expect(can(null, { anyOf: ['attendance:view:self'] })).toBe(false);
    });

    it('returns false for undefined user', () => {
      expect(can(undefined, { anyOf: ['attendance:view:self'] })).toBe(false);
    });
  });
});

describe('ruleLabel', () => {
  it('formats anyOf rule', () => {
    expect(ruleLabel({ anyOf: ['a', 'b'] })).toBe('anyOf(a,b)');
  });

  it('formats compound rule', () => {
    expect(ruleLabel({ anyOf: ['a'], allOf: ['b'], not: ['c'] })).toBe('anyOf(a) allOf(b) not(c)');
  });

  it('returns fallback for empty rule', () => {
    expect(ruleLabel({})).toBe('no-permission');
  });
});
