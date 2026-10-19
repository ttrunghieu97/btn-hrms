import { EmployeePolicies } from './employee.policy';
import { QueryScopeService } from '../query-scope.service';
import { hasPermission, resolvePermissions } from '@project/permissions';

describe('EmployeePolicies & QueryScopeService Regression', () => {
  const queryScopeService = new QueryScopeService({
    can: (user: { permissions?: string[] }, perm: string) =>
      hasPermission(user.permissions ?? [], perm),
  } as never);

  describe('EmployeePolicies.view', () => {
    it('allows self access with employee:view:self and employees:view:self', () => {
      const userSingular = {
        id: 'user-1',
        employeeId: 'employee-1',
        departmentId: 'dept-1',
        permissions: ['employee:view:self'],
      };
      const userPlural = {
        id: 'user-1',
        employeeId: 'employee-1',
        departmentId: 'dept-1',
        permissions: ['employees:view:self'],
      };
      const ownResource = { id: 'employee-1', departmentId: 'dept-2' };
      const otherResource = { id: 'employee-2', departmentId: 'dept-1' };

      expect(EmployeePolicies.view.handle(userSingular as never, ownResource)).toBe(true);
      expect(EmployeePolicies.view.handle(userPlural as never, ownResource)).toBe(true);
      expect(EmployeePolicies.view.handle(userSingular as never, otherResource)).toBe(false);
    });

    it('allows department access only inside same department even if user also has employee:edit', () => {
      const deptManager = {
        id: 'user-1',
        employeeId: 'employee-1',
        departmentId: 'dept-1',
        permissions: ['employee:view:department', 'employee:edit'],
      };

      expect(
        EmployeePolicies.view.handle(deptManager as never, { id: 'employee-2', departmentId: 'dept-1' }),
      ).toBe(true);
      expect(
        EmployeePolicies.view.handle(deptManager as never, { id: 'employee-3', departmentId: 'dept-2' }),
      ).toBe(false);
    });

    it('allows all access with employee:view:all or employees:manage', () => {
      const hrViewer = {
        id: 'user-1',
        employeeId: 'employee-1',
        departmentId: 'dept-1',
        permissions: ['employee:view:all'],
      };
      const hrManager = {
        id: 'user-2',
        employeeId: 'employee-2',
        departmentId: 'dept-1',
        permissions: ['employees:manage'],
      };

      expect(
        EmployeePolicies.view.handle(hrViewer as never, { id: 'employee-9', departmentId: 'dept-9' }),
      ).toBe(true);
      expect(
        EmployeePolicies.view.handle(hrManager as never, { id: 'employee-9', departmentId: 'dept-9' }),
      ).toBe(true);
    });

    it('uses sys:all instead of legacy ALL for global override', () => {
      expect(
        EmployeePolicies.view.handle({ permissions: ['sys:all'] } as never, { id: 'employee-2' }),
      ).toBe(true);
      expect(
        EmployeePolicies.view.handle({ permissions: ['ALL'] } as never, { id: 'employee-2' }),
      ).toBe(false);
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

  describe('EmployeePolicies.viewAll & EditEmployeePolicy', () => {
    it('denies self-only and department-only users (even when combined with employee:edit) while allowing global HR viewers/editors', () => {
      const selfUser = { permissions: ['employee:view:self'] };
      const selfEditor = {
        id: 'u-self',
        employeeId: 'emp-self',
        departmentId: 'dept-1',
        permissions: ['employee:view:self', 'employee:edit'],
      };
      const deptUser = {
        id: 'u-dept',
        employeeId: 'emp-dept',
        departmentId: 'dept-1',
        permissions: ['employee:view:department', 'employee:edit'],
      };
      const globalViewer = { permissions: ['employee:view:all'] };
      const globalEditor = { permissions: ['employee:update:all'] };
      const hrManager = { permissions: ['employee:manage'] };

      expect(EmployeePolicies.viewAll.handle(selfUser as never)).toBe(false);
      expect(EmployeePolicies.viewAll.handle(selfEditor as never)).toBe(false);
      expect(EmployeePolicies.viewAll.handle(deptUser as never)).toBe(false);
      expect(EmployeePolicies.viewAll.handle(globalViewer as never)).toBe(true);
      expect(EmployeePolicies.viewAll.handle(globalEditor as never)).toBe(true);
      expect(EmployeePolicies.viewAll.handle(hrManager as never)).toBe(true);

      // Self-scoped user with employee:edit can only view/edit own record
      expect(
        EmployeePolicies.view.handle(selfEditor as never, { id: 'emp-self', departmentId: 'dept-1' }),
      ).toBe(true);
      expect(
        EmployeePolicies.view.handle(selfEditor as never, { id: 'emp-other', departmentId: 'dept-1' }),
      ).toBe(false);
      expect(
        EmployeePolicies.edit.handle(selfEditor as never, { id: 'emp-self', departmentId: 'dept-1' }),
      ).toBe(true);
      expect(
        EmployeePolicies.edit.handle(selfEditor as never, { id: 'emp-other', departmentId: 'dept-1' }),
      ).toBe(false);

      // Department-scoped user with employee:edit can only edit records in own department
      expect(
        EmployeePolicies.edit.handle(deptUser as never, { id: 'emp-other', departmentId: 'dept-1' }),
      ).toBe(true);
      expect(
        EmployeePolicies.edit.handle(deptUser as never, { id: 'emp-other-dept', departmentId: 'dept-2' }),
      ).toBe(false);
    });
  });

  describe('EmployeePolicies.approveTransfer', () => {
    it('requires manager/approval authority (not mere visibility), allows in-department transfer (except own), and denies out-of-department or self-only', () => {
      const deptViewerOnly = {
        id: 'u-viewer',
        employeeId: 'emp-viewer',
        departmentId: 'dept-1',
        permissions: ['employee:view:department'],
      };
      const globalViewerOnly = {
        id: 'u-global-viewer',
        employeeId: 'emp-global-viewer',
        departmentId: 'dept-1',
        permissions: ['employee:view:all'],
      };
      const deptManager = {
        id: 'u-mgr',
        employeeId: 'emp-mgr',
        departmentId: 'dept-1',
        permissions: ['employee:view:department', 'employee:edit'],
      };
      const selfEditor = {
        id: 'u-self',
        employeeId: 'emp-self',
        departmentId: 'dept-1',
        permissions: ['employee:view:self', 'employee:edit'],
      };
      const hrManager = {
        id: 'u-hr',
        employeeId: 'emp-hr',
        departmentId: 'dept-hr',
        permissions: ['employee:manage'],
      };

      // Read-only viewers cannot approve transfers
      expect(
        EmployeePolicies.approveTransfer.handle(deptViewerOnly as never, {
          id: 'emp-subordinate',
          departmentId: 'dept-1',
        }),
      ).toBe(false);
      expect(
        EmployeePolicies.approveTransfer.handle(globalViewerOnly as never, {
          id: 'emp-subordinate',
          departmentId: 'dept-1',
        }),
      ).toBe(false);

      // Department manager with employee:edit can approve subordinate in same department
      expect(
        EmployeePolicies.approveTransfer.handle(deptManager as never, {
          id: 'emp-subordinate',
          departmentId: 'dept-1',
        }),
      ).toBe(true);
      // Cannot approve own transfer
      expect(
        EmployeePolicies.approveTransfer.handle(deptManager as never, {
          id: 'emp-mgr',
          departmentId: 'dept-1',
        }),
      ).toBe(false);
      // Cannot approve out-of-department transfer
      expect(
        EmployeePolicies.approveTransfer.handle(deptManager as never, {
          id: 'emp-other',
          departmentId: 'dept-2',
        }),
      ).toBe(false);
      // Self-scoped user cannot approve transfers even with employee:edit
      expect(
        EmployeePolicies.approveTransfer.handle(selfEditor as never, {
          id: 'emp-subordinate',
          departmentId: 'dept-1',
        }),
      ).toBe(false);
      // HR manager can approve across departments
      expect(
        EmployeePolicies.approveTransfer.handle(hrManager as never, {
          id: 'emp-other',
          departmentId: 'dept-2',
        }),
      ).toBe(true);
    });
  });

  describe('QueryScopeService & @project/permissions hierarchy resolution', () => {
    it('resolves employee:* and employees:* aliases consistently and ensures employee:edit does NOT imply employee:update:all', () => {
      expect(hasPermission(['employee:view:all'], 'employees:view:department')).toBe(true);
      expect(hasPermission(['employees:view:all'], 'employee:view:self')).toBe(true);
      expect(hasPermission(['employee:edit'], 'employee:update:self')).toBe(true);
      expect(hasPermission(['employee:edit'], 'employee:update:all')).toBe(false);
      expect(hasPermission(['employee:update:all'], 'employee:edit')).toBe(true);
      expect(hasPermission(['employee:manage'], 'employee:update:all')).toBe(true);

      const resolved = resolvePermissions(['employee:view:department', 'employee:edit']);
      expect(resolved).toContain('employee:view:self');
      expect(resolved).toContain('employees:view:self');
      expect(resolved).toContain('employee:update:self');
      expect(resolved).not.toContain('employee:update:all');
      expect(resolved).not.toContain('employees:update:all');
    });

    it('keeps department tier when user has both employee:view:department and employee:edit', () => {
      const deptEditor = {
        id: 'u-1',
        employeeId: 'emp-1',
        departmentId: 'dept-1',
        permissions: resolvePermissions(['employee:view:department', 'employee:edit']),
      };
      const scope = queryScopeService.resolveScope(deptEditor as never, 'employees');
      expect(scope).toEqual({
        tier: 'department',
        scopeId: undefined,
        departmentId: 'dept-1',
      });
    });

    it('keeps self tier when user has both employee:view:self and employee:edit', () => {
      const selfEditor = {
        id: 'u-self',
        employeeId: 'emp-self',
        departmentId: 'dept-1',
        permissions: resolvePermissions(['employee:view:self', 'employee:edit']),
      };
      const scope = queryScopeService.resolveScope(selfEditor as never, 'employees');
      expect(scope).toEqual({
        tier: 'self',
        scopeId: undefined,
        employeeId: 'emp-self',
      });
    });
  });

  describe('EmployeePolicies.delete, resetPassword, and terminate resource scope', () => {
    it('enforces department and self scope on delete, resetPassword, and terminate when user lacks global manage/update:all/view:all', () => {
      const deptDeleter = {
        id: 'u-dept',
        employeeId: 'emp-dept',
        departmentId: 'dept-1',
        permissions: ['employee:view:department', 'employee:delete', 'employee:reset-password', 'employee:manage:sensitive'],
      };
      const selfDeleter = {
        id: 'u-self',
        employeeId: 'emp-self',
        departmentId: 'dept-1',
        permissions: ['employee:view:self', 'employee:delete', 'employee:reset-password', 'employee:manage:sensitive'],
      };
      const globalManager = {
        id: 'u-mgr',
        employeeId: 'emp-mgr',
        departmentId: 'dept-1',
        permissions: ['employee:manage'],
      };

      const inDeptResource = { id: 'emp-2', departmentId: 'dept-1' };
      const outDeptResource = { id: 'emp-3', departmentId: 'dept-2' };
      const selfResource = { id: 'emp-self', departmentId: 'dept-1' };

      expect(EmployeePolicies.delete.handle(deptDeleter as never, inDeptResource)).toBe(true);
      expect(EmployeePolicies.delete.handle(deptDeleter as never, outDeptResource)).toBe(false);
      expect(EmployeePolicies.resetPassword.handle(deptDeleter as never, inDeptResource)).toBe(true);
      expect(EmployeePolicies.resetPassword.handle(deptDeleter as never, outDeptResource)).toBe(false);
      expect(EmployeePolicies.terminate.handle(deptDeleter as never, inDeptResource)).toBe(true);
      expect(EmployeePolicies.terminate.handle(deptDeleter as never, outDeptResource)).toBe(false);

      expect(EmployeePolicies.delete.handle(selfDeleter as never, selfResource)).toBe(true);
      expect(EmployeePolicies.delete.handle(selfDeleter as never, inDeptResource)).toBe(false);
      expect(EmployeePolicies.resetPassword.handle(selfDeleter as never, selfResource)).toBe(true);
      expect(EmployeePolicies.resetPassword.handle(selfDeleter as never, inDeptResource)).toBe(false);
      expect(EmployeePolicies.terminate.handle(selfDeleter as never, selfResource)).toBe(true);
      expect(EmployeePolicies.terminate.handle(selfDeleter as never, inDeptResource)).toBe(false);

      expect(EmployeePolicies.delete.handle(globalManager as never, outDeptResource)).toBe(true);
      expect(EmployeePolicies.resetPassword.handle(globalManager as never, outDeptResource)).toBe(true);
      expect(EmployeePolicies.terminate.handle(globalManager as never, outDeptResource)).toBe(true);
    });
  });
});


