import { BadRequestException, ConflictException } from '@nestjs/common';
import { CreateRoleUseCase } from './create-role.usecase';

const makeAuditLog = () => ({ write: jest.fn().mockResolvedValue(undefined) });
const requestContext = {
  get: jest.fn().mockReturnValue({ userId: 'actor-1' }),
  getTraceId: jest.fn().mockReturnValue('trace-1'),
} as any;

function buildUseCase(overrides: {
  findByName?: jest.Mock;
  findByCode?: jest.Mock;
  create?: jest.Mock;
  auditLog?: ReturnType<typeof makeAuditLog>;
}) {
  const rolesRepository = {
    findByName: overrides.findByName ?? jest.fn().mockResolvedValue(null),
    findByCode: overrides.findByCode ?? jest.fn().mockResolvedValue(null),
    create: overrides.create ?? jest.fn().mockResolvedValue({ id: 'new-role', name: 'Test', code: 'test', permissions: [] }),
  } as any;

  const db = {
    transaction: jest.fn().mockImplementation((cb) => cb({})),
  } as any;

  const scopedDb = {
    getDb: jest.fn().mockReturnValue(db),
  } as any;

  const auditLog = overrides.auditLog ?? makeAuditLog();

  return { useCase: new CreateRoleUseCase(rolesRepository, requestContext, scopedDb, auditLog), auditLog };
}

describe('CreateRoleUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('blocks creating a role with isSystem=true and logs FAILED audit event', async () => {
    const { useCase, auditLog } = buildUseCase({});
    await expect(useCase.execute({ name: 'Hacked', isSystem: true })).rejects.toThrow(BadRequestException);
    expect(auditLog.write).toHaveBeenCalledWith(
      expect.objectContaining({ result: 'FAILED', action: 'ROLE_CREATE_FAILED' }),
    );
  });

  it('blocks duplicate role name and logs FAILED audit event', async () => {
    const { useCase, auditLog } = buildUseCase({
      findByName: jest.fn().mockResolvedValue({ id: 'existing' }),
    });
    await expect(useCase.execute({ name: 'Existing Role' })).rejects.toThrow(ConflictException);
    expect(auditLog.write).toHaveBeenCalledWith(
      expect.objectContaining({ result: 'FAILED', reason: 'ROLE_ALREADY_EXISTS' }),
    );
  });

  it('blocks duplicate role code and logs FAILED audit event', async () => {
    const { useCase, auditLog } = buildUseCase({
      findByCode: jest.fn().mockResolvedValue({ id: 'existing' }),
    });
    await expect(useCase.execute({ name: 'New Role', code: 'existing_code' })).rejects.toThrow(ConflictException);
    expect(auditLog.write).toHaveBeenCalledWith(
      expect.objectContaining({ result: 'FAILED', reason: 'ROLE_CODE_ALREADY_EXISTS' }),
    );
  });

  it('creates a valid role and logs SUCCESS audit event', async () => {
    const createMock = jest.fn().mockResolvedValue({ id: 'r1', name: 'Test', code: 'test', permissions: [] });
    const { useCase, auditLog } = buildUseCase({ create: createMock });

    const result = await useCase.execute({ name: 'Test', permissions: ['some.permission'] });
    expect(result).toMatchObject({ id: 'r1', name: 'Test' });
    expect(auditLog.write).toHaveBeenCalledWith(
      expect.objectContaining({ result: 'SUCCESS', action: 'ROLE_CREATED' }),
    );
  });
});
