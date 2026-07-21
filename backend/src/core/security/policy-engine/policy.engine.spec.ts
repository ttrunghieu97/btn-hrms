import { Test, type TestingModule } from '@nestjs/testing';
import { PolicyEngine } from './policy.engine';
import { PermissionHierarchyResolver } from '../permissions/permission-hierarchy.resolver';
import { type AuthUser } from '../types/auth-user.interface';
import { type PolicyHandler } from '../policies/policy-handler.interface';

describe('PolicyEngine', () => {
  let engine: PolicyEngine;
  let _resolver: PermissionHierarchyResolver;

  beforeEach(async () => {
    // Mock the hierarchy resolver to just check for exact matches
    const mockResolver = {
      satisfies: jest.fn((permissions: string[] | undefined, required: string) => {
        return (permissions || []).includes(required);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PolicyEngine,
        { provide: PermissionHierarchyResolver, useValue: mockResolver },
      ],
    }).compile();

    engine = module.get<PolicyEngine>(PolicyEngine);
    _resolver = module.get<PermissionHierarchyResolver>(PermissionHierarchyResolver);
  });

  const createCtx = (userOverrides: Partial<AuthUser> = {}) => ({
    user: {
      id: 'user1',
      permissions: [],
      ...userOverrides,
    } as AuthUser,
    action: 'TestAction',
  });

  it('should always allow super-admins', async () => {
    const ctx = createCtx({ isSuperAdmin: true });
    const handler: PolicyHandler = {
      requiredAnyOfPermissions: ['test:perm'],
      handle: () => false, // Would normally fail
    };

    const result = await engine.evaluate([handler], ctx);

    expect(result.allowed).toBe(true);
    expect(result.decidedBy).toBe('super_admin');
  });

  it('should always allow users with sys:all permission', async () => {
    const ctx = createCtx({ permissions: ['sys:all'] });
    const handler: PolicyHandler = {
      requiredAnyOfPermissions: ['test:perm'],
      handle: () => false, // Would normally fail
    };

    const result = await engine.evaluate([handler], ctx);

    expect(result.allowed).toBe(true);
    expect(result.decidedBy).toBe('super_admin');
  });

  it('should deny if permission fast-path fails (single handler)', async () => {
    const ctx = createCtx({ permissions: ['other:perm'] });
    const handler: PolicyHandler = {
      requiredAnyOfPermissions: ['required:perm'],
      handle: () => true, // Will not be called
    };

    const result = await engine.evaluate([handler], ctx);

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Missing required permissions');
  });

  it('should enforce AND semantics for multiple handlers (deny on first fail)', async () => {
    const ctx = createCtx({ permissions: ['perm:1'] }); // Has perm for H1, but not H2

    const h1: PolicyHandler = {
      policyName: 'H1',
      requiredAnyOfPermissions: ['perm:1'],
      handle: () => true,
    };

    const h2: PolicyHandler = {
      policyName: 'H2',
      requiredAnyOfPermissions: ['perm:2'],
      handle: () => true,
    };

    const result = await engine.evaluate([h1, h2], ctx);

    expect(result.allowed).toBe(false);
    expect(result.policyUsed).toBe('H2'); // Failed on H2's fast-path
  });

  it('should deny if all handlers fail fast-path (testing the specific bug fix)', async () => {
    // Before the fix, this would return allowed: true because all handlers would 'continue'
    const ctx = createCtx({ permissions: [] });

    const h1: PolicyHandler = {
      policyName: 'H1',
      requiredAnyOfPermissions: ['perm:1'],
      handle: () => true,
    };

    const h2: PolicyHandler = {
      policyName: 'H2',
      requiredAnyOfPermissions: ['perm:2'],
      handle: () => true,
    };

    const result = await engine.evaluate([h1, h2], ctx);

    expect(result.allowed).toBe(false);
    expect(result.policyUsed).toBe('H1'); // Should fail immediately on H1
  });

  it('should allow if all handlers pass', async () => {
    const ctx = createCtx({ permissions: ['perm:1', 'perm:2'] });

    const h1: PolicyHandler = {
      requiredAnyOfPermissions: ['perm:1'],
      handle: () => true,
    };

    const h2: PolicyHandler = {
      requiredAnyOfPermissions: ['perm:2'],
      handle: () => true,
    };

    const result = await engine.evaluate([h1, h2], ctx);

    expect(result.allowed).toBe(true);
    expect(result.permissionsChecked).toEqual(['perm:1', 'perm:2']);
  });

  it('should deny if handler logic fails even if permissions exist', async () => {
    const ctx = createCtx({ permissions: ['perm:1'] });

    const handler: PolicyHandler = {
      policyName: 'FailingLogicHandler',
      requiredAnyOfPermissions: ['perm:1'],
      handle: () => false, // Permission exists, but logic denies
    };

    const result = await engine.evaluate([handler], ctx);

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('denied access');
  });

  it('should allow if no handlers are provided', async () => {
    const ctx = createCtx();

    const result = await engine.evaluate([], ctx);

    expect(result.allowed).toBe(true);
    expect(result.decidedBy).toBe('default_deny'); // Wait, the original code returns default_deny for auth-only routes
  });
});
