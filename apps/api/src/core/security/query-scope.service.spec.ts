import { Test, type TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { QueryScopeService } from './query-scope.service';
import { PolicyEngine } from './policy-engine/policy.engine';
import { type AuthUser } from './types/auth-user.interface';

describe('QueryScopeService', () => {
  let service: QueryScopeService;
  let policyEngine: PolicyEngine;

  const mockUser: AuthUser = {
    id: 'user-1',
    employeeId: 'emp-1',
    departmentId: 'dept-1',
    username: 'test',
    roles: [],
    permissions: [],
    isSuperAdmin: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueryScopeService,
        {
          provide: PolicyEngine,
          useValue: {
            can: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<QueryScopeService>(QueryScopeService);
    policyEngine = module.get<PolicyEngine>(PolicyEngine);
  });

  it('should return "all" tier for super admins', () => {
    const user = { ...mockUser, isSuperAdmin: true };
    const result = service.resolveScope(user, 'attendance');
    expect(result).toEqual({ tier: 'all' });
  });

  it('should return "all" tier for users with ALL permission', () => {
    const user = { ...mockUser, permissions: ['ALL'] };
    const result = service.resolveScope(user, 'attendance');
    expect(result).toEqual({ tier: 'all' });
  });

  it('should return "all" tier for domain:view:all permission', () => {
    (policyEngine.can as jest.Mock).mockImplementation((u, p) => p === 'attendance:view:all');
    const result = service.resolveScope(mockUser, 'attendance');
    expect(result).toEqual({ tier: 'all' });
  });

  it('should return "all" tier for domain:view permission', () => {
    (policyEngine.can as jest.Mock).mockImplementation((u, p) => p === 'payroll:view');
    const result = service.resolveScope(mockUser, 'payroll');
    expect(result).toEqual({ tier: 'all' });
  });

  it('should return "department" tier with departmentId for domain:view:department permission', () => {
    (policyEngine.can as jest.Mock).mockImplementation((u, p) => p === 'attendance:view:department');
    const result = service.resolveScope(mockUser, 'attendance');
    expect(result).toEqual({ tier: 'department', departmentId: 'dept-1' });
  });

  it('should fall back to "self" if user has department view but no departmentId', () => {
    const userWithoutDept = { ...mockUser, departmentId: null };
    (policyEngine.can as jest.Mock).mockImplementation((u, p) => p === 'attendance:view:department' || p === 'attendance:view:self');
    const result = service.resolveScope(userWithoutDept, 'attendance');
    expect(result).toEqual({ tier: 'self', employeeId: 'emp-1' });
  });

  it('should throw ForbiddenException if user has department view but no departmentId and no self view', () => {
    const userWithoutDept = { ...mockUser, departmentId: null };
    (policyEngine.can as jest.Mock).mockImplementation((u, p) => p === 'attendance:view:department');
    expect(() => service.resolveScope(userWithoutDept, 'attendance')).toThrow(ForbiddenException);
  });

  it('should return "self" tier with employeeId for domain:view:self permission', () => {
    (policyEngine.can as jest.Mock).mockImplementation((u, p) => p === 'attendance:view:self');
    const result = service.resolveScope(mockUser, 'attendance');
    expect(result).toEqual({ tier: 'self', employeeId: 'emp-1' });
  });

  it('should throw ForbiddenException if user has self view but no employeeId', () => {
    const userWithoutEmp = { ...mockUser, employeeId: undefined };
    (policyEngine.can as jest.Mock).mockImplementation((u, p) => p === 'attendance:view:self');
    expect(() => service.resolveScope(userWithoutEmp, 'attendance')).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException if user has no view permissions', () => {
    (policyEngine.can as jest.Mock).mockReturnValue(false);
    expect(() => service.resolveScope(mockUser, 'attendance')).toThrow(ForbiddenException);
  });
});
