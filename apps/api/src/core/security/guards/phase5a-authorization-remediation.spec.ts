import { Test, type TestingModule } from "@nestjs/testing";
import { type ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthorizationGuard } from "./authorization.guard";
import { PolicyEngine } from "../policy-engine/policy.engine";
import { AuthorizationAuditService } from "../auth/authorization-audit.service";
import { PermissionHierarchyResolver } from "../permissions/permission-hierarchy.resolver";
import { Permissions } from "../permissions/permissions.registry";
import { QueryScopeService } from "../query-scope.service";
import { CONTRACTS_TOKENS } from "../../../contracts/contracts.tokens";
import { type AuthUser } from "../types/auth-user.interface";
import { PayrollController } from "../../../modules/payroll/payroll/payroll.controller";
import { SalaryStructuresController } from "../../../modules/payroll/salary-structures/salary-structures.controller";
import { PayslipsController } from "../../../modules/payroll/payslips/payslips.controller";
import { ListPayslipsUseCase } from "../../../modules/payroll/payslips/use-cases/list-payslips.usecase";
import { PayrollDashboardController } from "../../../modules/payroll/dashboard/payroll-dashboard.controller";
import { PayrollPeriodsController } from "../../../modules/payroll/payroll-periods/payroll-periods.controller";
import { PayrollRunsController } from "../../../modules/payroll/payroll-runs/payroll-runs.controller";
import { EmployeeDocumentsController } from "../../../modules/workforce/employee-documents/employee-documents.controller";
import { EmployeeEducationController } from "../../../modules/workforce/employees/employee-education.controller";
import { EmployeeAllowancesController } from "../../../modules/workforce/employee-allowances/employee-allowances.controller";
import { EmployeeSocialInsuranceController } from "../../../modules/workforce/employee-social-insurance/employee-social-insurance.controller";

describe("Phase 5A — P0 Authorization Remediation (SEC-001 & SEC-002)", () => {
  let guard: AuthorizationGuard;
  let hierarchyResolver: PermissionHierarchyResolver;
  let queryScopeService: QueryScopeService;
  let resourceLoaderMock: { load: jest.Mock };

  const employeesDb: Record<
    string,
    { id: string; userId: string; departmentId: string }
  > = {
    "emp-self": {
      id: "emp-self",
      userId: "user-self",
      departmentId: "dept-engineering",
    },
    "emp-colleague-same-dept": {
      id: "emp-colleague-same-dept",
      userId: "user-colleague",
      departmentId: "dept-engineering",
    },
    "emp-other-dept": {
      id: "emp-other-dept",
      userId: "user-other",
      departmentId: "dept-finance",
    },
  };

  const payslipsDb: Record<
    string,
    { id: string; employeeId: string; departmentId: string }
  > = {
    "payslip-self": {
      id: "payslip-self",
      employeeId: "emp-self",
      departmentId: "dept-engineering",
    },
    "payslip-other": {
      id: "payslip-other",
      employeeId: "emp-other-dept",
      departmentId: "dept-finance",
    },
  };

  const buildUser = (
    overrides: Partial<AuthUser> & { rawPermissions: string[] },
  ): AuthUser => {
    const { rawPermissions, ...rest } = overrides;
    return {
      id: "user-self",
      userId: "user-self",
      username: "self.employee",
      employeeId: "emp-self",
      departmentId: "dept-engineering",
      permissions: hierarchyResolver.expand(rawPermissions),
      roles: ["employee_base"],
      isSuperAdmin: false,
      ...rest,
    };
  };

  const createControllerContext = <T extends object>(
    controllerClass: new (...args: never[]) => T,
    methodName: keyof T & string,
    user: AuthUser,
    params: Record<string, string> = {},
    query: Record<string, string> = {},
  ): ExecutionContext => {
    const handler = controllerClass.prototype[methodName] as (...args: unknown[]) => unknown;
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          params,
          query,
        }),
      }),
      getHandler: () => handler,
      getClass: () => controllerClass,
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    resourceLoaderMock = {
      load: jest.fn(async (entityName: string, id: string) => {
        if (entityName === "Employee") {
          return employeesDb[id] ?? null;
        }
        if (entityName === "Payroll") {
          return payslipsDb[id] ?? null;
        }
        return null;
      }),
    };

    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorizationGuard,
        Reflector,
        PolicyEngine,
        PermissionHierarchyResolver,
        QueryScopeService,
        {
          provide: CONTRACTS_TOKENS.RESOURCE_CONTEXT_READER_PORT,
          useValue: resourceLoaderMock,
        },
        {
          provide: AuthorizationAuditService,
          useValue: {
            record: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = testingModule.get<AuthorizationGuard>(AuthorizationGuard);
    hierarchyResolver = testingModule.get<PermissionHierarchyResolver>(
      PermissionHierarchyResolver,
    );
    queryScopeService = testingModule.get<QueryScopeService>(QueryScopeService);
  });

  describe("SEC-001 — Payroll and Salary Structures Authorization", () => {
    it("1. Baseline self-service user cannot list company-wide payroll (GET /payroll)", async () => {
      const selfServiceUser = buildUser({
        rawPermissions: [
          Permissions.PAYROLL_VIEW_SELF,
          Permissions.EMPLOYEES_VIEW_SELF,
        ],
      });

      const ctx = createControllerContext(
        PayrollController,
        "list",
        selfServiceUser,
      );

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });

    it("2. Baseline self-service user cannot list or view salary structures (GET /payroll/salary-structures, GET /payroll/salary-structures/:id)", async () => {
      const selfServiceUser = buildUser({
        rawPermissions: [
          Permissions.PAYROLL_VIEW_SELF,
          Permissions.EMPLOYEES_VIEW_SELF,
        ],
      });

      const listCtx = createControllerContext(
        SalaryStructuresController,
        "list",
        selfServiceUser,
      );
      await expect(guard.canActivate(listCtx)).rejects.toThrow(
        ForbiddenException,
      );

      const detailCtx = createControllerContext(
        SalaryStructuresController,
        "get",
        selfServiceUser,
        { id: "struct-1" },
      );
      await expect(guard.canActivate(detailCtx)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("denies baseline self-service user on related company-wide payroll dashboard, periods, runs, and other employee payroll detail/mutation routes", async () => {
      const selfServiceUser = buildUser({
        rawPermissions: [
          Permissions.PAYROLL_VIEW_SELF,
          Permissions.EMPLOYEES_VIEW_SELF,
        ],
      });

      await expect(
        guard.canActivate(
          createControllerContext(
            PayrollDashboardController,
            "getDashboard",
            selfServiceUser,
          ),
        ),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        guard.canActivate(
          createControllerContext(
            PayrollPeriodsController,
            "list",
            selfServiceUser,
          ),
        ),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        guard.canActivate(
          createControllerContext(
            PayrollPeriodsController,
            "get",
            selfServiceUser,
            { id: "period-1" },
          ),
        ),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        guard.canActivate(
          createControllerContext(
            PayrollRunsController,
            "list",
            selfServiceUser,
          ),
        ),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        guard.canActivate(
          createControllerContext(
            PayrollRunsController,
            "get",
            selfServiceUser,
            { id: "run-1" },
          ),
        ),
      ).rejects.toThrow(ForbiddenException);

      // Cannot view another employee's payroll via GET /payroll/:employeeId
      await expect(
        guard.canActivate(
          createControllerContext(
            PayrollController,
            "getByEmployee",
            selfServiceUser,
            { employeeId: "emp-other-dept" },
          ),
        ),
      ).rejects.toThrow(ForbiddenException);

      // Cannot mutate payroll or salary structures
      await expect(
        guard.canActivate(
          createControllerContext(
            PayrollController,
            "upsert",
            selfServiceUser,
            { employeeId: "emp-self" },
          ),
        ),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        guard.canActivate(
          createControllerContext(
            SalaryStructuresController,
            "upsert",
            selfServiceUser,
          ),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("7. Authorized payroll/HR roles retain intended access to payroll and salary structures", async () => {
      const payrollViewAllUser = buildUser({
        id: "user-payroll-auditor",
        rawPermissions: [Permissions.PAYROLL_VIEW_ALL],
        roles: ["payroll_manager"],
      });

      const payrollEditorUser = buildUser({
        id: "user-payroll-editor",
        rawPermissions: [Permissions.PAYROLL_EDIT],
        roles: ["payroll_manager"],
      });

      await expect(
        guard.canActivate(
          createControllerContext(PayrollController, "list", payrollViewAllUser),
        ),
      ).resolves.toBe(true);

      await expect(
        guard.canActivate(
          createControllerContext(
            SalaryStructuresController,
            "list",
            payrollViewAllUser,
          ),
        ),
      ).resolves.toBe(true);

      await expect(
        guard.canActivate(
          createControllerContext(
            SalaryStructuresController,
            "get",
            payrollViewAllUser,
            { id: "struct-1" },
          ),
        ),
      ).resolves.toBe(true);

      await expect(
        guard.canActivate(
          createControllerContext(
            PayrollDashboardController,
            "getDashboard",
            payrollViewAllUser,
          ),
        ),
      ).resolves.toBe(true);

      // payroll:edit expands to payroll:view via PERMISSION_HIERARCHY
      await expect(
        guard.canActivate(
          createControllerContext(PayrollController, "list", payrollEditorUser),
        ),
      ).resolves.toBe(true);

      await expect(
        guard.canActivate(
          createControllerContext(
            SalaryStructuresController,
            "upsert",
            payrollEditorUser,
          ),
        ),
      ).resolves.toBe(true);
    });

    it("8. Existing personal payslip access still works and enforces self-scoping", async () => {
      const selfServiceUser = buildUser({
        rawPermissions: [Permissions.PAYROLL_VIEW_SELF],
      });

      // Personal payslip list route is allowed by guard and scoped to self by QueryScopeService
      await expect(
        guard.canActivate(
          createControllerContext(
            PayslipsController,
            "list",
            selfServiceUser,
          ),
        ),
      ).resolves.toBe(true);

      const listMock = jest.fn().mockResolvedValue({
        rows: [],
        total: 0,
        page: 1,
        limit: 20,
      });
      const listPayslipsUseCase = new ListPayslipsUseCase(
        { list: listMock } as never,
        {} as never,
      );
      const scope = queryScopeService.resolveScope(selfServiceUser, "payroll");
      expect(scope).toEqual({ tier: "self", employeeId: "emp-self" });

      await listPayslipsUseCase.execute(
        { employeeId: "emp-other-dept", page: 1, limit: 20 },
        scope,
      );
      expect(listMock).toHaveBeenCalledWith(
        { employeeId: "emp-other-dept", page: 1, limit: 20 },
        { tier: "self", employeeId: "emp-self" },
      );

      // Personal payroll summary by own employeeId succeeds
      await expect(
        guard.canActivate(
          createControllerContext(
            PayrollController,
            "getByEmployee",
            selfServiceUser,
            { employeeId: "emp-self" },
          ),
        ),
      ).resolves.toBe(true);

      // Own payslip detail route succeeds
      await expect(
        guard.canActivate(
          createControllerContext(
            PayslipsController,
            "get",
            selfServiceUser,
            { id: "payslip-self" },
          ),
        ),
      ).resolves.toBe(true);

      // Another employee's payslip detail route is denied
      await expect(
        guard.canActivate(
          createControllerContext(
            PayslipsController,
            "get",
            selfServiceUser,
            { id: "payslip-other" },
          ),
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("SEC-002 — Employee Nested Resources Authorization", () => {
    it("3. A user cannot read another employee's documents (GET /employees/:employeeId/documents)", async () => {
      const selfServiceUser = buildUser({
        rawPermissions: [Permissions.EMPLOYEES_VIEW_SELF],
      });

      const otherCtx = createControllerContext(
        EmployeeDocumentsController,
        "list",
        selfServiceUser,
        { employeeId: "emp-other-dept" },
      );
      await expect(guard.canActivate(otherCtx)).rejects.toThrow(
        ForbiddenException,
      );
      expect(resourceLoaderMock.load).toHaveBeenCalledWith(
        "Employee",
        "emp-other-dept",
      );

      // Self access continues to work
      const selfCtx = createControllerContext(
        EmployeeDocumentsController,
        "list",
        selfServiceUser,
        { employeeId: "emp-self" },
      );
      await expect(guard.canActivate(selfCtx)).resolves.toBe(true);
    });

    it("4. A user cannot read another employee's education records (GET /employees/:employeeId/educations)", async () => {
      const selfServiceUser = buildUser({
        rawPermissions: [Permissions.EMPLOYEES_VIEW_SELF],
      });

      const otherCtx = createControllerContext(
        EmployeeEducationController,
        "findAll",
        selfServiceUser,
        { employeeId: "emp-other-dept" },
      );
      await expect(guard.canActivate(otherCtx)).rejects.toThrow(
        ForbiddenException,
      );
      expect(resourceLoaderMock.load).toHaveBeenCalledWith(
        "Employee",
        "emp-other-dept",
      );

      // Self access continues to work
      const selfCtx = createControllerContext(
        EmployeeEducationController,
        "findAll",
        selfServiceUser,
        { employeeId: "emp-self" },
      );
      await expect(guard.canActivate(selfCtx)).resolves.toBe(true);
    });

    it("5. A user cannot read another employee's allowances (GET /employees/:employeeId/allowances)", async () => {
      const selfServiceUser = buildUser({
        rawPermissions: [Permissions.EMPLOYEES_VIEW_SELF],
      });

      const otherCtx = createControllerContext(
        EmployeeAllowancesController,
        "findAll",
        selfServiceUser,
        { employeeId: "emp-other-dept" },
      );
      await expect(guard.canActivate(otherCtx)).rejects.toThrow(
        ForbiddenException,
      );
      expect(resourceLoaderMock.load).toHaveBeenCalledWith(
        "Employee",
        "emp-other-dept",
      );

      // Self access continues to work
      const selfCtx = createControllerContext(
        EmployeeAllowancesController,
        "findAll",
        selfServiceUser,
        { employeeId: "emp-self" },
      );
      await expect(guard.canActivate(selfCtx)).resolves.toBe(true);
    });

    it("6. A user cannot read another employee's social-insurance records (GET /employees/:employeeId/social-insurance)", async () => {
      const selfServiceUser = buildUser({
        rawPermissions: [Permissions.EMPLOYEES_VIEW_SELF],
      });

      const otherCtx = createControllerContext(
        EmployeeSocialInsuranceController,
        "findAll",
        selfServiceUser,
        { employeeId: "emp-other-dept" },
      );
      await expect(guard.canActivate(otherCtx)).rejects.toThrow(
        ForbiddenException,
      );
      expect(resourceLoaderMock.load).toHaveBeenCalledWith(
        "Employee",
        "emp-other-dept",
      );

      // Self access continues to work
      const selfCtx = createControllerContext(
        EmployeeSocialInsuranceController,
        "findAll",
        selfServiceUser,
        { employeeId: "emp-self" },
      );
      await expect(guard.canActivate(selfCtx)).resolves.toBe(true);
    });

    it("enforces department-scoped and HR/admin access rules across all 4 nested employee controllers (read & mutation)", async () => {
      const deptViewer = buildUser({
        id: "user-dept-mgr",
        employeeId: "emp-self",
        departmentId: "dept-engineering",
        rawPermissions: [Permissions.EMPLOYEES_VIEW_DEPARTMENT],
      });

      const deptEditor = buildUser({
        id: "user-dept-editor",
        employeeId: "emp-self",
        departmentId: "dept-engineering",
        rawPermissions: [
          Permissions.EMPLOYEES_VIEW_DEPARTMENT,
          Permissions.EMPLOYEES_EDIT,
        ],
      });

      const hrAdmin = buildUser({
        id: "user-hr",
        employeeId: "emp-self",
        departmentId: "dept-hr",
        rawPermissions: [
          Permissions.EMPLOYEES_VIEW_ALL,
          Permissions.EMPLOYEES_EDIT,
        ],
      });

      const nestedReadTargets = [
        [EmployeeDocumentsController, "list"],
        [EmployeeEducationController, "findAll"],
        [EmployeeAllowancesController, "findAll"],
        [EmployeeSocialInsuranceController, "findAll"],
      ] as const;

      for (const [ControllerCls, method] of nestedReadTargets) {
        // Department viewer can read same-department employee nested resources
        await expect(
          guard.canActivate(
            createControllerContext(
              ControllerCls as never,
              method as never,
              deptViewer,
              { employeeId: "emp-colleague-same-dept" },
            ),
          ),
        ).resolves.toBe(true);

        // Department viewer CANNOT read other-department employee nested resources
        await expect(
          guard.canActivate(
            createControllerContext(
              ControllerCls as never,
              method as never,
              deptViewer,
              { employeeId: "emp-other-dept" },
            ),
          ),
        ).rejects.toThrow(ForbiddenException);

        // HR with employee:view:all can read any employee's nested resources
        await expect(
          guard.canActivate(
            createControllerContext(
              ControllerCls as never,
              method as never,
              hrAdmin,
              { employeeId: "emp-other-dept" },
            ),
          ),
        ).resolves.toBe(true);
      }

      const nestedMutationTargets = [
        [EmployeeDocumentsController, "create"],
        [EmployeeDocumentsController, "remove"],
        [EmployeeEducationController, "create"],
        [EmployeeEducationController, "update"],
        [EmployeeEducationController, "remove"],
        [EmployeeAllowancesController, "create"],
        [EmployeeAllowancesController, "update"],
        [EmployeeAllowancesController, "remove"],
        [EmployeeSocialInsuranceController, "create"],
        [EmployeeSocialInsuranceController, "update"],
        [EmployeeSocialInsuranceController, "remove"],
      ] as const;

      for (const [ControllerCls, method] of nestedMutationTargets) {
        // Department viewer (no edit permission) is denied on mutations
        await expect(
          guard.canActivate(
            createControllerContext(
              ControllerCls as never,
              method as never,
              deptViewer,
              { employeeId: "emp-colleague-same-dept" },
            ),
          ),
        ).rejects.toThrow(ForbiddenException);

        // Department-scoped editor can mutate same-department employee nested resources
        await expect(
          guard.canActivate(
            createControllerContext(
              ControllerCls as never,
              method as never,
              deptEditor,
              { employeeId: "emp-colleague-same-dept" },
            ),
          ),
        ).resolves.toBe(true);

        // Department-scoped editor CANNOT mutate other-department employee nested resources
        await expect(
          guard.canActivate(
            createControllerContext(
              ControllerCls as never,
              method as never,
              deptEditor,
              { employeeId: "emp-other-dept" },
            ),
          ),
        ).rejects.toThrow(ForbiddenException);

        // HR editor (with employee:view:all + employee:edit) can mutate any employee nested resources
        await expect(
          guard.canActivate(
            createControllerContext(
              ControllerCls as never,
              method as never,
              hrAdmin,
              { employeeId: "emp-other-dept" },
            ),
          ),
        ).resolves.toBe(true);
      }
    });

    it("denies self-service and department viewers when target employee resource does not exist in DB", async () => {
      const selfServiceUser = buildUser({
        rawPermissions: [Permissions.EMPLOYEES_VIEW_SELF],
      });

      const missingCtx = createControllerContext(
        EmployeeDocumentsController,
        "list",
        selfServiceUser,
        { employeeId: "emp-nonexistent-or-deleted" },
      );

      await expect(guard.canActivate(missingCtx)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("9. Mutation use-cases reject cross-employee allowanceId / enrollmentId substitution under an authorized employeeId path", async () => {
      const { UpdateEmployeeAllowanceUseCase } = await import(
        "../../../modules/workforce/employee-allowances/use-cases/update-employee-allowance.usecase"
      );
      const { DeleteEmployeeAllowanceUseCase } = await import(
        "../../../modules/workforce/employee-allowances/use-cases/delete-employee-allowance.usecase"
      );
      const { UpdateEmployeeSocialInsuranceUseCase } = await import(
        "../../../modules/workforce/employee-social-insurance/use-cases/update-employee-social-insurance.usecase"
      );
      const { DeleteEmployeeSocialInsuranceUseCase } = await import(
        "../../../modules/workforce/employee-social-insurance/use-cases/delete-employee-social-insurance.usecase"
      );

      const allowanceRepoMock = {
        findById: jest.fn().mockResolvedValue({
          id: "allowance-other",
          employeeId: "emp-other-dept",
        }),
        update: jest.fn(),
        delete: jest.fn(),
      };
      const updateAllowance = new UpdateEmployeeAllowanceUseCase(
        allowanceRepoMock as never,
      );
      const deleteAllowance = new DeleteEmployeeAllowanceUseCase(
        allowanceRepoMock as never,
      );

      await expect(
        updateAllowance.execute(
          "allowance-other",
          { amount: 5000000 },
          "emp-colleague-same-dept",
        ),
      ).rejects.toThrow("Allowance not found");
      expect(allowanceRepoMock.update).not.toHaveBeenCalled();

      await expect(
        deleteAllowance.execute("allowance-other", "emp-colleague-same-dept"),
      ).rejects.toThrow("Allowance not found");
      expect(allowanceRepoMock.delete).not.toHaveBeenCalled();

      const siRepoMock = {
        findById: jest.fn().mockResolvedValue({
          id: "si-other",
          employeeId: "emp-other-dept",
        }),
        update: jest.fn(),
        delete: jest.fn(),
      };
      const updateSi = new UpdateEmployeeSocialInsuranceUseCase(
        siRepoMock as never,
      );
      const deleteSi = new DeleteEmployeeSocialInsuranceUseCase(
        siRepoMock as never,
      );

      await expect(
        updateSi.execute(
          "si-other",
          { status: "inactive" },
          "emp-colleague-same-dept",
        ),
      ).rejects.toThrow("Social insurance enrollment not found");
      expect(siRepoMock.update).not.toHaveBeenCalled();

      await expect(
        deleteSi.execute("si-other", "emp-colleague-same-dept"),
      ).rejects.toThrow("Social insurance enrollment not found");
      expect(siRepoMock.delete).not.toHaveBeenCalled();
    });
  });
});
