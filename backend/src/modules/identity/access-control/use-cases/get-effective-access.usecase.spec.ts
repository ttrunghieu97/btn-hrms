import { GetEffectiveAccessUseCase } from './get-effective-access.usecase';

describe('GetEffectiveAccessUseCase', () => {
  it('returns role permissions plus active grants minus explicit denials', async () => {
    const repository = {
      getRolePermissionCodesForUser: jest.fn().mockResolvedValue([
        'employees:view:self',
        'employees:view:department',
      ]),
      getActiveGrantPermissionCodesForUser: jest.fn().mockResolvedValue([
        'payroll:view:all',
      ]),
      getDeniedPermissionCodesForUser: jest.fn().mockResolvedValue([
        'employees:view:department',
      ]),
    };

    const useCase = new GetEffectiveAccessUseCase(repository as never);

    await expect(useCase.execute('user-1')).resolves.toEqual({
      userId: 'user-1',
      permissions: ['employees:view:self', 'payroll:view:all'],
      source: {
        rolePermissions: ['employees:view:self', 'employees:view:department'],
        activeGrants: ['payroll:view:all'],
        denials: ['employees:view:department'],
      },
    });
  });
});
