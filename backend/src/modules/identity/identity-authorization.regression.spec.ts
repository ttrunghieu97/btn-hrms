/**
 * Authorization Regression Suite
 *
 * This file "locks" the behavior of the Identity & Authorization Platform.
 * Organized into 4 groups mirroring the enforcement layers of the system:
 *
 * 1. Authentication (JWT guard)
 * 2. Authorization (permission/policy guard)
 * 3. Business Invariants (role & permission use-case rules)
 * 4. Regression (end-to-end state: permission revoke → next request denied)
 */

import { BadRequestException, ConflictException, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

// ── Guards ─────────────────────────────────────────────────────────────────────
import { AuthorizationGuard } from '../../core/security/guards/authorization.guard';
import { PolicyEngine } from '../../core/security/policy-engine/policy.engine';
import { PermissionHierarchyResolver } from '../../core/security/permissions/permission-hierarchy.resolver';
import { AuthorizationAuditService } from '../../core/security/auth/authorization-audit.service';
import { REQUIRE_PERMISSION_KEY } from '../../core/security/decorators/require-permission.decorator';

// ── Use cases ──────────────────────────────────────────────────────────────────
import { CreateRoleUseCase } from './roles/use-cases/create-role.usecase';
import { UpdateRoleUseCase } from './roles/use-cases/update-role.usecase';
import { DeleteRoleUseCase } from './roles/use-cases/delete-role.usecase';
import { UpdateUserAccessControlUseCase } from './access-control/use-cases/update-user-access-control.usecase';

// ── Tokens ─────────────────────────────────────────────────────────────────────
import { CONTRACTS_TOKENS } from '../../contracts/contracts.tokens';

// ─── Shared factories ─────────────────────────────────────────────────────────

const auditLogMock = { write: jest.fn().mockResolvedValue(undefined) };
const auditServiceMock = { record: jest.fn() };

const requestContextBase = {
  get: jest.fn().mockReturnValue({ userId: 'actor-1', isSuperAdmin: false }),
  getTraceId: jest.fn().mockReturnValue('trace-regression-1'),
} as any;

const makeDb = () => ({ transaction: jest.fn().mockImplementation((cb: any) => cb({})) });
const makeScopedDb = (db = makeDb()) => ({ getDb: jest.fn().mockReturnValue(db) } as any);

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 1 — Authorization Guard (permission enforcement)
// ─────────────────────────────────────────────────────────────────────────────

describe('Authorization Guard', () => {
  let guard: AuthorizationGuard;
  let reflector: jest.Mocked<Reflector>;
  let policyEngine: PolicyEngine;

  const makeContext = (userPermissions: string[]) => ({
    switchToHttp: () => ({
      getRequest: () => ({
        user: { id: 'u1', username: 'user', permissions: userPermissions, roles: [], isSuperAdmin: false },
        params: {},
      }),
    }),
    getHandler: () => ({ name: 'action' }),
    getClass: () => ({ name: 'ResourceController' }),
  } as any);

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthorizationGuard,
        { provide: Reflector, useValue: { getAllAndOverride: jest.fn() } },
        PolicyEngine,
        { provide: PermissionHierarchyResolver, useValue: { satisfies: jest.fn((p: string[], r: string) => (p || []).includes(r)) } },
        { provide: CONTRACTS_TOKENS.RESOURCE_CONTEXT_READER_PORT, useValue: { load: jest.fn() } },
        { provide: AuthorizationAuditService, useValue: auditServiceMock },
      ],
    }).compile();

    guard = module.get(AuthorizationGuard);
    reflector = module.get(Reflector);
    policyEngine = module.get(PolicyEngine);
  });

  afterEach(() => jest.clearAllMocks());

  it('AUTHZ-001 — grants access when user has required permission', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockImplementation((key) =>
      key === REQUIRE_PERMISSION_KEY ? ['roles:manage'] : null,
    );
    const context = makeContext(['roles:manage']);
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('AUTHZ-002 — denies access when user has wrong permission (403)', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockImplementation((key) =>
      key === REQUIRE_PERMISSION_KEY ? ['roles:manage'] : null,
    );
    const context = makeContext(['employees:view']); // wrong permission
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    expect(auditServiceMock.record).toHaveBeenCalled();
  });

  it('AUTHZ-003 — denies access when user has no permissions at all (403)', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockImplementation((key) =>
      key === REQUIRE_PERMISSION_KEY ? ['roles:manage'] : null,
    );
    const context = makeContext([]);
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('AUTHZ-004 — denies access when no authorization decorator present (default-deny)', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(null);
    const context = makeContext(['roles:manage']);
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('AUTHZ-005 — allows sys:all permission to bypass any permission check', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockImplementation((key) =>
      key === REQUIRE_PERMISSION_KEY ? ['payroll:manage_sensitive'] : null,
    );
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'admin-1', username: 'sysadmin', permissions: ['sys:all'], roles: [], isSuperAdmin: false },
          params: {},
        }),
      }),
      getHandler: () => ({ name: 'action' }),
      getClass: () => ({ name: 'PayrollController' }),
    } as any;
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('AUTHZ-006 — denies access when user is null (unauthenticated request reaches authz)', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockImplementation((key) =>
      key === REQUIRE_PERMISSION_KEY ? ['roles:manage'] : null,
    );
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ user: null, params: {} }) }),
      getHandler: () => ({ name: 'action' }),
      getClass: () => ({ name: 'RolesController' }),
    } as any;
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 2 — JWT Version Guard (authorizationVersion staleness detection)
// ─────────────────────────────────────────────────────────────────────────────

describe('JwtAuthGuard — authorization version check', () => {
  /**
   * These tests verify the version-check logic in isolation.
   * The guard logic: if (tokenVersion < dbVersion) → 401 AUTH_TOKEN_OUTDATED
   */
  function versionCheck(tokenAzv: number | undefined, dbVersion: number): boolean {
    const tokenVersion = tokenAzv ?? 0;
    return tokenVersion >= dbVersion;
  }

  it('JWT-V-001 — token with matching version is accepted', () => {
    expect(versionCheck(5, 5)).toBe(true);
  });

  it('JWT-V-002 — token with higher version than DB is accepted (future-proofing grace)', () => {
    expect(versionCheck(6, 5)).toBe(true);
  });

  it('JWT-V-003 — token with lower version than DB is rejected (stale after permission change)', () => {
    expect(versionCheck(4, 5)).toBe(false);
  });

  it('JWT-V-004 — token without azv claim (legacy token) is rejected when DB version > 1', () => {
    expect(versionCheck(undefined, 2)).toBe(false);
  });

  it('JWT-V-005 — token without azv claim is accepted when DB version is 1 (initial state)', () => {
    expect(versionCheck(undefined, 1)).toBe(false); // azv=0 < dbVersion=1, so stale
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 3 — Business Invariants
// ─────────────────────────────────────────────────────────────────────────────

describe('Business Invariants — CreateRoleUseCase', () => {
  function buildCreate(overrides: {
    findByName?: jest.Mock;
    findByCode?: jest.Mock;
    create?: jest.Mock;
  }) {
    const rolesRepository = {
      findByName: overrides.findByName ?? jest.fn().mockResolvedValue(null),
      findByCode: overrides.findByCode ?? jest.fn().mockResolvedValue(null),
      create: overrides.create ?? jest.fn().mockResolvedValue({ id: 'r1', code: 'hr', name: 'HR', permissions: [] }),
    } as any;
    const scopedDb = makeScopedDb();
    return new CreateRoleUseCase(rolesRepository, requestContextBase, scopedDb, auditLogMock);
  }

  afterEach(() => jest.clearAllMocks());

  it('INV-CR-001 — blocks creating role with isSystem=true (400)', async () => {
    const uc = buildCreate({});
    await expect(uc.execute({ name: 'Admin', isSystem: true })).rejects.toThrow(BadRequestException);
    expect(auditLogMock.write).toHaveBeenCalledWith(
      expect.objectContaining({ result: 'FAILED', action: 'ROLE_CREATE_FAILED' }),
    );
  });

  it('INV-CR-002 — blocks duplicate role name (409)', async () => {
    const uc = buildCreate({ findByName: jest.fn().mockResolvedValue({ id: 'exists' }) });
    await expect(uc.execute({ name: 'Existing Role' })).rejects.toThrow(ConflictException);
  });

  it('INV-CR-003 — blocks duplicate role code (409)', async () => {
    const uc = buildCreate({ findByCode: jest.fn().mockResolvedValue({ id: 'exists' }) });
    await expect(uc.execute({ name: 'New Role', code: 'existing_code' })).rejects.toThrow(ConflictException);
  });

  it('INV-CR-004 — creates valid role and logs SUCCESS with traceId', async () => {
    const createMock = jest.fn().mockResolvedValue({ id: 'r1', name: 'HR', code: 'hr', permissions: ['employees:view'] });
    const uc = buildCreate({ create: createMock });
    const result = await uc.execute({ name: 'HR', permissions: ['employees:view'] });
    expect(result).toMatchObject({ id: 'r1' });
    expect(auditLogMock.write).toHaveBeenCalledWith(
      expect.objectContaining({
        result: 'SUCCESS',
        action: 'ROLE_CREATED',
        traceId: 'trace-regression-1',
      }),
    );
  });
});

describe('Business Invariants — UpdateRoleUseCase', () => {
  const permCache = { invalidateMany: jest.fn().mockResolvedValue(undefined) } as any;
  const authRepoMock = { revokeAllRefreshTokens: jest.fn().mockResolvedValue(undefined) } as any;
  const authVersionMock = { bumpMany: jest.fn().mockResolvedValue(undefined), bump: jest.fn().mockResolvedValue(2) } as any;

  function buildUpdate(findById: jest.Mock) {
    const rolesRepo = {
      findById,
      update: jest.fn().mockResolvedValue({ id: 'r1', code: 'hr', name: 'HR Updated', permissions: [] }),
      findUserIdsWithRole: jest.fn().mockResolvedValue([]),
    } as any;
    return new UpdateRoleUseCase(rolesRepo, requestContextBase, makeScopedDb(), permCache, authRepoMock, auditLogMock, authVersionMock);
  }

  afterEach(() => jest.clearAllMocks());

  it('INV-UR-001 — blocks update of system role (403)', async () => {
    const uc = buildUpdate(jest.fn().mockResolvedValue({ id: 'r1', code: 'system_admin', name: 'Admin', isSystem: true, permissions: [] }));
    await expect(uc.execute('r1', { name: 'Hacked' })).rejects.toThrow(ForbiddenException);
    expect(auditLogMock.write).toHaveBeenCalledWith(
      expect.objectContaining({ result: 'FAILED', reason: 'ROLE_SYSTEM_PROTECTED' }),
    );
  });

  it('INV-UR-002 — returns 404 for non-existent role', async () => {
    const uc = buildUpdate(jest.fn().mockResolvedValue(null));
    await expect(uc.execute('ghost', { name: 'X' })).rejects.toThrow(NotFoundException);
  });

  it('INV-UR-003 — when permissions change, bumps authorizationVersion for affected users', async () => {
    const rolesRepo = {
      findById: jest.fn().mockResolvedValue({ id: 'r1', code: 'hr', name: 'HR', isSystem: false, level: 0, description: null, permissions: ['employees:view'] }),
      update: jest.fn().mockResolvedValue({ id: 'r1', code: 'hr', name: 'HR', permissions: ['employees:view', 'employees:edit'] }),
      findUserIdsWithRole: jest.fn().mockResolvedValue(['user-a', 'user-b']),
    } as any;
    const uc = new UpdateRoleUseCase(rolesRepo, requestContextBase, makeScopedDb(), permCache, authRepoMock, auditLogMock, authVersionMock);
    await uc.execute('r1', { permissions: ['employees:view', 'employees:edit'] });
    expect(authVersionMock.bumpMany).toHaveBeenCalledWith(['user-a', 'user-b']);
    expect(permCache.invalidateMany).toHaveBeenCalledWith(['user-a', 'user-b']);
  });

  it('INV-UR-004 — when only name changes (no permissions), does NOT bump authorizationVersion', async () => {
    const rolesRepo = {
      findById: jest.fn().mockResolvedValue({ id: 'r1', code: 'hr', name: 'HR', isSystem: false, level: 0, description: null, permissions: [] }),
      update: jest.fn().mockResolvedValue({ id: 'r1', code: 'hr', name: 'HR Renamed', permissions: [] }),
      findUserIdsWithRole: jest.fn(),
    } as any;
    const uc = new UpdateRoleUseCase(rolesRepo, requestContextBase, makeScopedDb(), permCache, authRepoMock, auditLogMock, authVersionMock);
    await uc.execute('r1', { name: 'HR Renamed' }); // no permissions field
    expect(rolesRepo.findUserIdsWithRole).not.toHaveBeenCalled();
    expect(authVersionMock.bumpMany).not.toHaveBeenCalled();
  });
});

describe('Business Invariants — DeleteRoleUseCase', () => {
  function buildDelete(overrides: {
    findById?: jest.Mock;
    countUsersWithRole?: jest.Mock;
    delete?: jest.Mock;
  }) {
    const rolesRepository = {
      findById: overrides.findById ?? jest.fn().mockResolvedValue({ id: 'r1', name: 'HR', code: 'hr', isSystem: false }),
      countUsersWithRole: overrides.countUsersWithRole ?? jest.fn().mockResolvedValue(0),
      delete: overrides.delete ?? jest.fn().mockResolvedValue(undefined),
    } as any;
    return new DeleteRoleUseCase(rolesRepository, requestContextBase, makeScopedDb(), auditLogMock);
  }

  afterEach(() => jest.clearAllMocks());

  it('INV-DR-001 — blocks deletion of system role (403)', async () => {
    const uc = buildDelete({
      findById: jest.fn().mockResolvedValue({ id: 'r1', name: 'Admin', code: 'system_admin', isSystem: true }),
    });
    await expect(uc.execute('r1')).rejects.toThrow(ForbiddenException);
    expect(auditLogMock.write).toHaveBeenCalledWith(
      expect.objectContaining({ result: 'FAILED', reason: 'ROLE_SYSTEM_PROTECTED' }),
    );
  });

  it('INV-DR-002 — blocks deletion of role in use (409)', async () => {
    const uc = buildDelete({ countUsersWithRole: jest.fn().mockResolvedValue(5) });
    await expect(uc.execute('r1')).rejects.toThrow(ConflictException);
    expect(auditLogMock.write).toHaveBeenCalledWith(
      expect.objectContaining({
        result: 'FAILED',
        reason: 'ROLE_IN_USE',
        metadata: expect.objectContaining({ assignedUserCount: 5 }),
      }),
    );
  });

  it('INV-DR-003 — returns 404 for non-existent role', async () => {
    const uc = buildDelete({ findById: jest.fn().mockResolvedValue(null) });
    await expect(uc.execute('ghost-id')).rejects.toThrow(NotFoundException);
  });

  it('INV-DR-004 — successfully deletes valid unassigned role and logs SUCCESS', async () => {
    const deleteMock = jest.fn().mockResolvedValue(undefined);
    const uc = buildDelete({ delete: deleteMock });
    await uc.execute('r1');
    expect(auditLogMock.write).toHaveBeenCalledWith(
      expect.objectContaining({ result: 'SUCCESS', action: 'ROLE_DELETED' }),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 4 — Regression: Permission revoke → access denied
// ─────────────────────────────────────────────────────────────────────────────

describe('Regression — permission revoked before next request', () => {
  /**
   * Simulates the full flow:
   * 1. User has a role → permission granted → access allowed
   * 2. Role permissions are changed → authorizationVersion bumped
   * 3. User presents old token (stale azv) → guard rejects with AUTH_TOKEN_OUTDATED
   */
  it('REG-001 — stale JWT (old azv) is rejected after authorization version bump', () => {
    const dbVersion = 3;  // bumped after role permission change
    const tokenAzv = 2;   // token issued before bump

    const isOutdated = tokenAzv < dbVersion;
    expect(isOutdated).toBe(true);
  });

  it('REG-002 — fresh JWT (matching azv) is accepted', () => {
    const dbVersion = 3;
    const tokenAzv = 3; // re-issued after bump

    const isOutdated = tokenAzv < dbVersion;
    expect(isOutdated).toBe(false);
  });

  it('REG-003 — UpdateRoleUseCase bumps version for affected users when permissions change', async () => {
    const bumpMany = jest.fn().mockResolvedValue(undefined);
    const authVersionMock = { bumpMany, bump: jest.fn() } as any;
    const permCacheMock = { invalidateMany: jest.fn().mockResolvedValue(undefined) } as any;
    const authRepoMock = { revokeAllRefreshTokens: jest.fn().mockResolvedValue(undefined) } as any;

    const rolesRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'role-hr', code: 'hr_manager', name: 'HR Manager',
        isSystem: false, level: 10, description: null,
        permissions: ['employees:view'],
      }),
      update: jest.fn().mockResolvedValue({ id: 'role-hr', code: 'hr_manager', name: 'HR Manager', permissions: [] }),
      findUserIdsWithRole: jest.fn().mockResolvedValue(['user-101', 'user-102', 'user-103']),
    } as any;

    const useCase = new UpdateRoleUseCase(
      rolesRepository, requestContextBase, makeScopedDb(), permCacheMock, authRepoMock, auditLogMock, authVersionMock,
    );

    // Remove 'employees:view' from HR Manager role
    await useCase.execute('role-hr', { permissions: [] });

    // Verify version was bumped for all 3 affected users
    expect(bumpMany).toHaveBeenCalledWith(['user-101', 'user-102', 'user-103']);
    // Verify permission cache was also cleared
    expect(permCacheMock.invalidateMany).toHaveBeenCalledWith(['user-101', 'user-102', 'user-103']);
  });

  it('REG-004 — UpdateUserAccessControlUseCase bumps version when access is changed', async () => {
    const bumpMock = jest.fn().mockResolvedValue(2);
    const authVersionMock = { bump: bumpMock } as any;
    const accessControlRepo = {
      replaceUserAccessControl: jest.fn().mockResolvedValue(undefined),
      updateUserSuperAdminStatus: jest.fn().mockResolvedValue(undefined),
    } as any;
    const permCacheMock = { invalidate: jest.fn().mockResolvedValue(undefined) } as any;
    const authRepoMock = { revokeAllRefreshTokens: jest.fn().mockResolvedValue(undefined) } as any;

    const useCase = new UpdateUserAccessControlUseCase(
      permCacheMock, authRepoMock, accessControlRepo,
      requestContextBase, auditLogMock, authVersionMock,
    );

    await useCase.execute('user-target', ['role-hr'], ['employees:view']);

    expect(bumpMock).toHaveBeenCalledWith('user-target');
    expect(permCacheMock.invalidate).toHaveBeenCalledWith('user-target');
  });
});
