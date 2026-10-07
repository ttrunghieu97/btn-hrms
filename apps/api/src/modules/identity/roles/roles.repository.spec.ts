import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UpdateRoleUseCase } from './use-cases/update-role.usecase';
import { DeleteRoleUseCase } from './use-cases/delete-role.usecase';

const makeAuditLog = () => ({ write: jest.fn().mockResolvedValue(undefined) });
const cacheManager = { invalidateMany: jest.fn().mockResolvedValue(undefined) };
const authRepo = { revokeAllRefreshTokens: jest.fn().mockResolvedValue(undefined) };
const requestContext = {
  get: jest.fn().mockReturnValue({ userId: 'actor-1' }),
  getTraceId: jest.fn().mockReturnValue('trace-1'),
} as any;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('UpdateRoleUseCase', () => {
  it('rejects updates to system roles and logs FAILED audit event', async () => {
    const auditLog = makeAuditLog();
    const rolesRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'role-1',
        code: 'system_admin',
        name: 'Admin',
        isSystem: true,
        level: 100,
        permissions: [],
      }),
    } as any;

    const scopedDb = { getDb: jest.fn().mockReturnValue({ transaction: jest.fn() }) } as any;
    const authVersion = { bumpMany: jest.fn().mockResolvedValue(undefined) } as any;
    const useCase = new UpdateRoleUseCase(
      rolesRepository, requestContext, scopedDb, cacheManager as any, authRepo as any, auditLog, authVersion,
    );

    await expect(useCase.execute('role-1', { name: 'Admin2' })).rejects.toThrow(ForbiddenException);
    expect(auditLog.write).toHaveBeenCalledWith(
      expect.objectContaining({ result: 'FAILED', action: 'ROLE_UPDATE_FAILED' }),
    );
  });

  it('rejects updating missing roles', async () => {
    const auditLog = makeAuditLog();
    const rolesRepository = { findById: jest.fn().mockResolvedValue(null) } as any;
    const scopedDb = { getDb: jest.fn().mockReturnValue({ transaction: jest.fn() }) } as any;
    const authVersion = { bumpMany: jest.fn().mockResolvedValue(undefined) } as any;

    const useCase = new UpdateRoleUseCase(
      rolesRepository, requestContext, scopedDb, cacheManager as any, authRepo as any, auditLog, authVersion,
    );

    await expect(useCase.execute('missing-role', { name: 'Admin' })).rejects.toThrow(NotFoundException);
  });
});

describe('DeleteRoleUseCase', () => {
  it('rejects deleting system roles and logs FAILED audit event', async () => {
    const auditLog = makeAuditLog();
    const rolesRepository = {
      findById: jest.fn().mockResolvedValue({ id: 'role-1', name: 'Admin', code: 'system_admin', isSystem: true }),
      countUsersWithRole: jest.fn(),
    } as any;
    const scopedDb = { getDb: jest.fn().mockReturnValue({ transaction: jest.fn() }) } as any;

    const useCase = new DeleteRoleUseCase(rolesRepository, requestContext, scopedDb, auditLog);

    await expect(useCase.execute('role-1')).rejects.toThrow(ForbiddenException);
    expect(rolesRepository.countUsersWithRole).not.toHaveBeenCalled();
    expect(auditLog.write).toHaveBeenCalledWith(
      expect.objectContaining({ result: 'FAILED', action: 'ROLE_DELETE_FAILED', reason: 'ROLE_SYSTEM_PROTECTED' }),
    );
  });

  it('rejects deleting a role that is still assigned to users (ROLE_IN_USE) and logs FAILED audit event', async () => {
    const auditLog = makeAuditLog();
    const rolesRepository = {
      findById: jest.fn().mockResolvedValue({ id: 'role-2', name: 'Manager', code: 'manager', isSystem: false }),
      countUsersWithRole: jest.fn().mockResolvedValue(3),
    } as any;
    const scopedDb = { getDb: jest.fn().mockReturnValue({ transaction: jest.fn() }) } as any;

    const useCase = new DeleteRoleUseCase(rolesRepository, requestContext, scopedDb, auditLog);

    await expect(useCase.execute('role-2')).rejects.toThrow(ConflictException);
    expect(auditLog.write).toHaveBeenCalledWith(
      expect.objectContaining({
        result: 'FAILED',
        action: 'ROLE_DELETE_FAILED',
        reason: 'ROLE_IN_USE',
        metadata: expect.objectContaining({ assignedUserCount: 3 }),
      }),
    );
  });

  it('rejects deleting missing roles', async () => {
    const auditLog = makeAuditLog();
    const rolesRepository = {
      findById: jest.fn().mockResolvedValue(null),
      countUsersWithRole: jest.fn(),
    } as any;
    const scopedDb = { getDb: jest.fn().mockReturnValue({ transaction: jest.fn() }) } as any;

    const useCase = new DeleteRoleUseCase(rolesRepository, requestContext, scopedDb, auditLog);

    await expect(useCase.execute('missing-role')).rejects.toThrow(NotFoundException);
    expect(rolesRepository.countUsersWithRole).not.toHaveBeenCalled();
  });
});
