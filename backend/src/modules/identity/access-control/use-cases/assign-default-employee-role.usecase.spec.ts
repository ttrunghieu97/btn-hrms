import { AssignDefaultEmployeeRoleUseCase } from './assign-default-employee-role.usecase';

describe('AssignDefaultEmployeeRoleUseCase', () => {
  it('assigns employee_base role by code to the user linked to the employee', async () => {
    const rolesRepo = {
      findByCode: jest.fn().mockResolvedValue({ id: 'role-1', code: 'employee_base', name: 'Employee Base' }),
      assignRolesToUser: jest.fn().mockResolvedValue(undefined),
    };
    const permissionCache = { invalidate: jest.fn().mockResolvedValue(undefined) };
    const authRepo = { revokeAllRefreshTokens: jest.fn().mockResolvedValue(undefined) };
    const requestContext = { getStore: jest.fn() };

    const useCase = new AssignDefaultEmployeeRoleUseCase(
      permissionCache as never,
      authRepo as never,
      rolesRepo as never,
      requestContext as never,
    );

    await useCase.execute('user-1');

    expect(rolesRepo.findByCode).toHaveBeenCalledWith('employee_base');
    expect(rolesRepo.assignRolesToUser).toHaveBeenCalledWith('user-1', ['role-1']);
  });
});
