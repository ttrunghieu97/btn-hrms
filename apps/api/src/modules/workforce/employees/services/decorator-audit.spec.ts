import { Reflector } from "@nestjs/core";
import { CHECK_POLICY_KEY } from "../../../../core/security/decorators/check-policy.decorator";
import { RESOURCE_KEY } from "../../../../core/security/decorators/resource.decorator";
import { EmployeePolicies } from "../../../../core/security/policies/employee.policy";
import { QueryScopeService } from "../../../../core/security/query-scope.service";
import { EmployeeAdminController } from "../employee-admin.controller";
import { DepartmentEmployeesController } from "../department-employees.controller";
import { EmployeeEducationController } from "../employee-education.controller";
import { EmployeeContractsController } from "../../employee-contracts/employee-contracts.controller";
import { EmployeeDocumentsController } from "../../employee-documents/employee-documents.controller";
import { EmployeeAllowancesController } from "../../employee-allowances/employee-allowances.controller";
import { EmployeeSocialInsuranceController } from "../../employee-social-insurance/employee-social-insurance.controller";
import { EmployeeTimelineController } from "../../employee-timeline/employee-timeline.controller";
import { LaborReportController } from "../../labor-report/labor-report.controller";
import { GetContractUseCase } from "../../contracts/use-cases/get-contract.usecase";
import { GetDocumentUseCase } from "../../documents/use-cases/get-document.usecase";
import { ListWorkflowInstancesUseCase } from "../../../platform-workflow-engine/use-cases/list-workflow-instances.usecase";
import { GetWorkflowInstanceUseCase } from "../../../platform-workflow-engine/use-cases/get-workflow-instance.usecase";

describe("Controller Decorator & Out-of-Scope Protection Audit", () => {
  const reflector = new Reflector();

  it("employee-admin.controller.ts has @CheckPolicy and @Resource(Employee, 'id') on all single-employee mutation & transfer endpoints", () => {
    const resourceScopedMethods = [
      "statusHistory",
      "changeStatus",
      "terminate",
      "remove",
      "restore",
      "rehireEmployee",
      "purge",
      "scheduleTermination",
      "cancelScheduledTermination",
      "requestEmployeeTransfer",
      "managerApproveTransfer",
      "hrApproveTransfer",
      "rejectTransfer",
      "applyTransfer",
      "cancelTransfer",
      "resetPassword",
    ] as const;

    for (const method of resourceScopedMethods) {
      const handler = EmployeeAdminController.prototype[method];
      const policies = reflector.getAllAndOverride(CHECK_POLICY_KEY, [
        handler,
        EmployeeAdminController,
      ]);
      expect(policies).toBeDefined();
      expect(Array.isArray(policies) && policies.length).toBeGreaterThan(0);

      const resourceMeta = reflector.getAllAndOverride(RESOURCE_KEY, [
        handler,
        EmployeeAdminController,
      ]);
      expect(resourceMeta).toEqual({
        entityName: "Employee",
        param: "id",
      });
    }
  });

  it("LaborReportController and check-code/check-username enforce EmployeePolicies.viewAll", () => {
    for (const method of ["export", "exportDocx"] as const) {
      const handler = LaborReportController.prototype[method];
      const policies = reflector.getAllAndOverride(CHECK_POLICY_KEY, [
        handler,
        LaborReportController,
      ]);
      expect(policies).toContain(EmployeePolicies.viewAll);
    }

    for (const method of ["checkEmployeeCode", "checkUsernameAvailability"] as const) {
      const handler = EmployeeAdminController.prototype[method];
      const policies = reflector.getAllAndOverride(CHECK_POLICY_KEY, [
        handler,
        EmployeeAdminController,
      ]);
      expect(policies).toContain(EmployeePolicies.viewAll);
    }
  });

  it("all nested employee sub-resource controllers enforce @CheckPolicy and @Resource(Employee, 'employeeId')", () => {
    const nestedControllerRoutes = [
      [EmployeeContractsController, ["get", "history", "update"]],
      [EmployeeTimelineController, ["findAll"]],
      [EmployeeDocumentsController, ["list", "create", "remove"]],
      [EmployeeEducationController, ["findAll", "create", "update", "remove"]],
      [EmployeeAllowancesController, ["findAll", "create", "update", "remove"]],
      [
        EmployeeSocialInsuranceController,
        ["findAll", "create", "update", "remove"],
      ],
    ] as const;

    for (const [ControllerCls, methods] of nestedControllerRoutes) {
      for (const method of methods) {
        const handler = (ControllerCls.prototype as Record<string, any>)[method];
        expect(handler).toBeDefined();

        const policies = reflector.getAllAndOverride(CHECK_POLICY_KEY, [
          handler,
          ControllerCls,
        ]);
        expect(policies).toBeDefined();
        expect(Array.isArray(policies) && policies.length).toBeGreaterThan(0);

        const resourceMeta = reflector.getAllAndOverride(RESOURCE_KEY, [
          handler,
          ControllerCls,
        ]);
        expect(resourceMeta).toEqual({
          entityName: "Employee",
          param: "employeeId",
        });
      }
    }
  });

  it("DepartmentEmployeesController rejects out-of-scope department access for department and self users", () => {
    const listEmployees = { execute: jest.fn().mockResolvedValue({ data: [] }) };
    const controller = new DepartmentEmployeesController(
      listEmployees as never,
      new QueryScopeService({
        can: (user: { permissions?: string[] }, perm: string) =>
          (user.permissions ?? []).includes(perm) ||
          (user.permissions ?? []).includes(perm.replace(/^employees:/, "employee:")),
      } as never),
    );

    expect(() =>
      controller.listByDepartment(
        "dept-other",
        {} as never,
        {
          user: {
            id: "u-mgr",
            employeeId: "emp-mgr",
            departmentId: "dept-own",
            permissions: ["employee:view:department"],
          } as never,
        },
      ),
    ).toThrow();
    expect(listEmployees.execute).not.toHaveBeenCalled();
  });

  it("GetContractUseCase and GetDocumentUseCase reject out-of-scope department and self access", async () => {
    const getContract = new GetContractUseCase({
      findById: jest.fn().mockResolvedValue({
        id: "c-1",
        employeeId: "emp-other",
        departmentId: "dept-other",
      }),
    } as never);

    await expect(
      getContract.execute("c-1", {
        tier: "department",
        departmentId: "dept-own",
        employeeId: "emp-mgr",
      }),
    ).rejects.toThrow();

    await expect(
      getContract.execute("c-1", {
        tier: "self",
        departmentId: "dept-other",
        employeeId: "emp-self",
      }),
    ).rejects.toThrow();

    const getDocument = new GetDocumentUseCase({
      findById: jest.fn().mockResolvedValue({
        id: "d-1",
        employeeId: "emp-other",
        departmentId: "dept-other",
      }),
    } as never);

    await expect(
      getDocument.execute("d-1", {
        tier: "department",
        departmentId: "dept-own",
        employeeId: "emp-mgr",
      }),
    ).rejects.toThrow();
  });

  it("WorkflowInstance use cases enforce both employee visibility scope and workflow subjectType access", async () => {
    const mockRepo = {
      getEmployeeScopeContext: jest.fn().mockImplementation(async (empId: string) => {
        if (empId === "emp-dept-1") return { id: "emp-dept-1", departmentId: "dept-1" };
        if (empId === "emp-dept-2") return { id: "emp-dept-2", departmentId: "dept-2" };
        return null;
      }),
      listInstances: jest.fn().mockResolvedValue([]),
      countInstances: jest.fn().mockResolvedValue(0),
      getInstance: jest.fn().mockImplementation(async (id: string) => {
        if (id === "wf-payroll") {
          return { id: "wf-payroll", subjectType: "payroll_run", subjectId: "emp-dept-1" };
        }
        if (id === "wf-transfer-other") {
          return { id: "wf-transfer-other", subjectType: "employee_transfer", subjectId: "emp-dept-2" };
        }
        return { id: "wf-transfer-own", subjectType: "employee_transfer", subjectId: "emp-dept-1" };
      }),
      listTransitionsByInstanceId: jest.fn().mockResolvedValue([]),
    };

    const listUseCase = new ListWorkflowInstancesUseCase(mockRepo as never);
    const getUseCase = new GetWorkflowInstanceUseCase(mockRepo as never);

    const deptViewerOnly = {
      id: "u-viewer",
      employeeId: "emp-viewer",
      departmentId: "dept-1",
      permissions: ["employee:view:department"],
    };

    const deptManager = {
      id: "u-mgr",
      employeeId: "emp-mgr",
      departmentId: "dept-1",
      permissions: ["employee:view:department", "employee:edit"],
    };

    // 0. Read-only viewer with only employee:view:department is denied workflow instance access -> 403
    await expect(
      listUseCase.execute(
        { subjectId: "emp-dept-1", page: 1, limit: 20 } as never,
        deptViewerOnly as never,
      ),
    ).rejects.toThrow();
    await expect(
      getUseCase.execute("wf-transfer-own", deptViewerOnly as never),
    ).rejects.toThrow();

    // 1. Missing subjectId for non-global workflow viewer -> 403
    await expect(
      listUseCase.execute({ page: 1, limit: 20 } as never, deptManager as never),
    ).rejects.toThrow();

    // 2. Non-employee subjectType (e.g., payroll_run) -> 403
    await expect(
      listUseCase.execute(
        { subjectId: "emp-dept-1", subjectType: "payroll_run", page: 1, limit: 20 } as never,
        deptManager as never,
      ),
    ).rejects.toThrow();

    // 3. Out-of-department employee subjectId -> 403
    await expect(
      listUseCase.execute(
        { subjectId: "emp-dept-2", page: 1, limit: 20 } as never,
        deptManager as never,
      ),
    ).rejects.toThrow();

    // 4. In-department employee subjectId -> allowed and restricted to employee subjectTypes
    await listUseCase.execute(
      { subjectId: "emp-dept-1", page: 1, limit: 20 } as never,
      deptManager as never,
    );
    expect(mockRepo.listInstances).toHaveBeenCalledWith(
      expect.objectContaining({
        subjectId: "emp-dept-1",
        subjectTypes: ["employee", "employee_transfer"],
      }),
    );

    // 5. GetWorkflowInstance blocks non-employee workflow and out-of-department employee workflow
    await expect(
      getUseCase.execute("wf-payroll", deptManager as never),
    ).rejects.toThrow();
    await expect(
      getUseCase.execute("wf-transfer-other", deptManager as never),
    ).rejects.toThrow();
    const allowed = await getUseCase.execute("wf-transfer-own", deptManager as never);
    expect(allowed.id).toBe("wf-transfer-own");
  });
});


