import { EmployeePolicies } from './employee.policy';

describe('EmployeePolicies.view', () => {
  it('allows self access with employees:view:self', () => {
    const user = {
      id: 'user-1',
      employeeId: 'employee-1',
      departmentId: 'dept-1',
      permissions: ['employees:view:self'],
    };
    const resource = { id: 'employee-1', departmentId: 'dept-2' };

    expect(EmployeePolicies.view.handle(user as never, resource)).toBe(true);
  });

  it('allows department access only inside same department', () => {
    const user = {
      id: 'user-1',
      employeeId: 'employee-1',
      departmentId: 'dept-1',
      permissions: ['employees:view:department'],
    };

    expect(EmployeePolicies.view.handle(user as never, { id: 'employee-2', departmentId: 'dept-1' })).toBe(true);
    expect(EmployeePolicies.view.handle(user as never, { id: 'employee-3', departmentId: 'dept-2' })).toBe(false);
  });

  it('allows all access with employees:view:all', () => {
    const user = {
      id: 'user-1',
      employeeId: 'employee-1',
      departmentId: 'dept-1',
      permissions: ['employees:view:all'],
    };

    expect(EmployeePolicies.view.handle(user as never, { id: 'employee-2', departmentId: 'dept-9' })).toBe(true);
  });

  it('uses sys:all instead of legacy ALL for global override', () => {
    expect(EmployeePolicies.view.handle({ permissions: ['sys:all'] } as never, { id: 'employee-2' })).toBe(true);
    expect(EmployeePolicies.view.handle({ permissions: ['ALL'] } as never, { id: 'employee-2' })).toBe(false);
  });
});
