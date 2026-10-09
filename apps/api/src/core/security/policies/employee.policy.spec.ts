import { EmployeePolicies } from './employee.policy';

describe('EmployeePolicies.view', () => {
  it('allows self access with employee:view:self', () => {
    const user = {
      id: 'user-1',
      employeeId: 'employee-1',
      departmentId: 'dept-1',
      permissions: ['employee:view:self'],
    };
    const resource = { id: 'employee-1', departmentId: 'dept-2' };

    expect(EmployeePolicies.view.handle(user as never, resource)).toBe(true);
  });

  it('allows department access only inside same department', () => {
    const user = {
      id: 'user-1',
      employeeId: 'employee-1',
      departmentId: 'dept-1',
      permissions: ['employee:view:department'],
    };

    expect(EmployeePolicies.view.handle(user as never, { id: 'employee-2', departmentId: 'dept-1' })).toBe(true);
    expect(EmployeePolicies.view.handle(user as never, { id: 'employee-3', departmentId: 'dept-2' })).toBe(false);
  });

  it('allows all access with employee:view:all', () => {
    const user = {
      id: 'user-1',
      employeeId: 'employee-1',
      departmentId: 'dept-1',
      permissions: ['employee:view:all'],
    };

    expect(EmployeePolicies.view.handle(user as never, { id: 'employee-2', departmentId: 'dept-9' })).toBe(true);
  });

  it('uses sys:all instead of legacy ALL for global override', () => {
    expect(EmployeePolicies.view.handle({ permissions: ['sys:all'] } as never, { id: 'employee-2' })).toBe(true);
    expect(EmployeePolicies.view.handle({ permissions: ['ALL'] } as never, { id: 'employee-2' })).toBe(false);
  });

  it('allows collection access without resource for department managers and self', () => {
    const deptUser = { permissions: ['employee:view:department'] };
    const selfUser = { permissions: ['employee:view:self'] };
    const unauthorizedUser = { permissions: ['benefits:view'] };

    expect(EmployeePolicies.view.handle(deptUser as never, undefined)).toBe(true);
    expect(EmployeePolicies.view.handle(selfUser as never, undefined)).toBe(true);
    expect(EmployeePolicies.view.handle(unauthorizedUser as never, undefined)).toBe(false);
  });
});
