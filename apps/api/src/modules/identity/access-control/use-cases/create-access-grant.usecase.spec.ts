import { CreateAccessGrantUseCase } from './create-access-grant.usecase';

describe('CreateAccessGrantUseCase', () => {
  it('requires reason approval and future expiry for direct grants', async () => {
    const repository = {
      createAccessGrant: jest.fn().mockResolvedValue({ id: 'grant-1' }),
      writeAccessAuditLog: jest.fn().mockResolvedValue(undefined),
    };
    const useCase = new CreateAccessGrantUseCase(repository as never);

    await expect(useCase.execute({
      actorUserId: 'admin-1',
      targetUserId: 'user-1',
      permissionCode: 'payroll:view:all',
      reason: 'cover payroll close',
      expiresAt: new Date('2099-01-01T00:00:00.000Z'),
    })).resolves.toEqual({ id: 'grant-1' });

    expect(repository.createAccessGrant).toHaveBeenCalledWith(expect.objectContaining({
      approvedByUserId: 'admin-1',
      reason: 'cover payroll close',
    }));
    expect(repository.writeAccessAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'grant.created',
      targetUserId: 'user-1',
      permissionCode: 'payroll:view:all',
    }));
  });

  it('rejects expired grants', async () => {
    const useCase = new CreateAccessGrantUseCase({} as never);
    await expect(useCase.execute({
      actorUserId: 'admin-1',
      targetUserId: 'user-1',
      permissionCode: 'payroll:view:all',
      reason: 'invalid',
      expiresAt: new Date('2000-01-01T00:00:00.000Z'),
    })).rejects.toThrow('Grant expiry must be in the future');
  });
});
