import { Test } from "@nestjs/testing";
import { PermissionHierarchyResolver } from "../../../core/security/permissions/permission-hierarchy.resolver";
import { PolicyEngine } from "../../../core/security/policy-engine/policy.engine";
import { QueryScopeService } from "../../../core/security/query-scope.service";
import { EmployeePolicies } from "../../../core/security/policies/employee.policy";
import { WorkflowPolicies } from "../../platform-workflow-engine/policies/workflow.policy";
import { ListWorkflowInstancesUseCase } from "../../platform-workflow-engine/use-cases/list-workflow-instances.usecase";
import { GetWorkflowInstanceUseCase } from "../../platform-workflow-engine/use-cases/get-workflow-instance.usecase";
import { PlatformWorkflowEngineRepository } from "../../platform-workflow-engine/repositories/platform-workflow-engine.repository";
import { ChangeEmployeeStatusUseCase } from "../employees/use-cases/change-employee-status.usecase";
import { RequestTransferUseCase } from "../employees/use-cases/request-transfer.usecase";
import { ApproveTransferUseCase } from "../employees/use-cases/approve-transfer.usecase";
import { ApplyTransferUseCase } from "../employees/use-cases/apply-transfer.usecase";
import { RejectTransferUseCase } from "../employees/use-cases/reject-transfer.usecase";
import { CancelTransferUseCase } from "../employees/use-cases/cancel-transfer.usecase";
import { DeleteEmployeeUseCase } from "../employees/use-cases/delete-employee.usecase";
import { RestoreArchivedEmployeeUseCase } from "../employees/use-cases/restore-archived-employee.usecase";
import { RehireEmployeeUseCase } from "../employees/use-cases/rehire-employee.usecase";
import { EmployeesRepository } from "../employees/repositories/employees.repository";
import { EmployeeLifecycleService } from "../employees/services/employee-lifecycle.service";
import { PlatformWorkflowEngineService } from "../../platform-workflow-engine/platform-workflow-engine.service";
import { CompleteOnboardingTaskUseCase } from "../../onboarding/use-cases/complete-onboarding-task.usecase";
import { OnboardingProcessRepository } from "../../onboarding/repositories/onboarding-process.repository";
import { DecideApprovalStepUseCase } from "../../platform-approval-engine/use-cases/decide-approval-step.usecase";
import { PlatformApprovalEngineRepository } from "../../platform-approval-engine/repositories/platform-approval-engine.repository";
import {
  GeneratePayrollRunUseCase,
  ApprovePayrollRunUseCase,
  PostPayrollRunUseCase,
} from "../../payroll/payroll-runs/use-cases/payroll-runs.usecases";
import { PayrollRunsRepository } from "../../payroll/payroll-runs/repositories/payroll-runs.repository";
import { PayrollRunStateMachine } from "../../payroll/payroll-runs/services/payroll-run-state-machine";
import { PublishPayslipUseCase } from "../../payroll/payslips/use-cases/publish-payslip.usecase";
import { PayslipsRepository } from "../../payroll/payslips/repositories/payslips.repository";
import { EventOutboxService } from "../../../core/events/event-outbox.service";
import { RequestContextService } from "../../../shared/context/request-context.service";
import { StorageService } from "../../../infrastructure/storage/storage.service";
import { CONTRACTS_TOKENS, ATTENDANCE_PAY_POLICY } from "../../../contracts";
import { ATTENDANCE_ADJUSTMENT_READER } from "../../../contracts/ports/attendance-adjustment-reader.port";
import { EmployeeTransferRequestedEvent } from "../../../core/events/events/employee-transfer-requested.event";
import { EmployeeTransferCancelledEvent } from "../../../core/events/events/employee-transfer-cancelled.event";
import { EmployeeRehiredEvent } from "../../../core/events/events/employee-rehired.event";
import { OnboardingCompletedEvent } from "../../onboarding/events/onboarding-completed.event";
import { ApprovalRequestCompletedEvent } from "../../../core/events/events/approval-request-completed.event";

describe("Core HR, Lifecycle, Approval & Payroll Integration Acceptance (Journeys 2–7, 10)", () => {
  describe("Journey 2: Employee detail, permission hierarchy, and query-scope isolation", () => {
    it("enforces department and self scope even when user holds employee:edit, and protects sensitive & workflow resources", async () => {
      const resolver = new PermissionHierarchyResolver();
      const policyEngine = new PolicyEngine(resolver);
      const scopeService = new QueryScopeService(policyEngine);

      // Department-scoped editor must NOT be widened to all
      const deptEditorPerms = resolver.expand([
        "employee:edit",
        "employee:view:department",
      ]);
      const deptEditor = {
        userId: "u-dept-mgr",
        username: "deptmgr",
        isSuperAdmin: false,
        permissions: deptEditorPerms,
        departmentId: "dept-eng",
        employeeId: "emp-dept-mgr",
      } as any;

      expect(deptEditorPerms).toContain("employee:update:self");
      expect(deptEditorPerms).not.toContain("employee:update:all");
      expect(deptEditorPerms).not.toContain("employee:view:all");
      expect(scopeService.resolveScope(deptEditor, "employee")).toEqual({
        tier: "department",
        scopeId: undefined,
        departmentId: "dept-eng",
      });

      // Self-scoped editor must remain restricted to self
      const selfEditorPerms = resolver.expand([
        "employee:edit",
        "employee:view:self",
      ]);
      const selfEditor = {
        userId: "u-self",
        username: "selfuser",
        isSuperAdmin: false,
        permissions: selfEditorPerms,
        departmentId: "dept-eng",
        employeeId: "emp-self",
      } as any;

      expect(scopeService.resolveScope(selfEditor, "employee")).toEqual({
        tier: "self",
        scopeId: undefined,
        employeeId: "emp-self",
      });
      expect(EmployeePolicies.viewSensitive.handle(deptEditor)).toBe(false);

      // Read-only viewer cannot view workflow instances or approve manager transfers
      const readOnlyViewer = {
        userId: "u-viewer",
        username: "viewer",
        isSuperAdmin: false,
        permissions: resolver.expand(["employee:view:department"]),
        departmentId: "dept-eng",
        employeeId: "emp-viewer",
      } as any;

      const inScopeEmp = { id: "emp-101", departmentId: "dept-eng" } as any;
      const outOfScopeEmp = { id: "emp-other", departmentId: "dept-sales" } as any;

      expect(EmployeePolicies.approveTransfer.handle(readOnlyViewer, inScopeEmp)).toBe(false);
      expect(WorkflowPolicies.viewInstances.handle(readOnlyViewer)).toBe(false);
      expect(EmployeePolicies.approveTransfer.handle(deptEditor, inScopeEmp)).toBe(true);
      expect(EmployeePolicies.approveTransfer.handle(deptEditor, outOfScopeEmp)).toBe(false);
      expect(WorkflowPolicies.viewInstances.handle(deptEditor)).toBe(true);

      // Direct use-case call to ListWorkflowInstancesUseCase / GetWorkflowInstanceUseCase with read-only viewer throws 403
      const wfRepo = {
        listInstances: jest.fn(),
        countInstances: jest.fn(),
        getInstance: jest.fn(),
        listTransitionsByInstanceId: jest.fn(),
        getEmployeeScopeContext: jest.fn(async () => ({
          id: "emp-other",
          userId: "u-other",
          departmentId: "dept-sales",
        })),
      };

      const mod = await Test.createTestingModule({
        providers: [
          ListWorkflowInstancesUseCase,
          GetWorkflowInstanceUseCase,
          { provide: PlatformWorkflowEngineRepository, useValue: wfRepo },
        ],
      }).compile();

      const listWf = mod.get(ListWorkflowInstancesUseCase);
      const getWf = mod.get(GetWorkflowInstanceUseCase);

      await expect(
        listWf.execute({ subjectId: "emp-other" } as any, readOnlyViewer),
      ).rejects.toThrow(
        "Workflow instance access requires workflow or employee lifecycle management permissions",
      );

      // Department-scoped editor cannot access workflow instance for employee in another department
      await expect(
        listWf.execute({ subjectId: "emp-other" } as any, deptEditor),
      ).rejects.toThrow("Out-of-scope employee workflow access denied");

      wfRepo.getInstance.mockResolvedValue({
        id: "wf-1",
        subjectType: "employee_transfer",
        subjectId: "emp-other",
      });
      await expect(getWf.execute("wf-1", deptEditor)).rejects.toThrow(
        "Out-of-scope employee workflow access denied",
      );
    });
  });

  describe("Journeys 3, 4 & 5: Probation confirmation, Transfer workflow boundaries, and Termination → Archive → Restore → Rehire", () => {
    let changeStatus: ChangeEmployeeStatusUseCase;
    let requestTransfer: RequestTransferUseCase;
    let approveTransfer: ApproveTransferUseCase;
    let applyTransfer: ApplyTransferUseCase;
    let rejectTransfer: RejectTransferUseCase;
    let cancelTransfer: CancelTransferUseCase;
    let deleteEmployee: DeleteEmployeeUseCase;
    let restoreArchived: RestoreArchivedEmployeeUseCase;
    let rehireEmployee: RehireEmployeeUseCase;

    let employeesStore: Map<string, any>;
    let workflowsStore: Map<string, any>;
    let stagedEvents: any[];
    let currentActor: any;

    beforeEach(async () => {
      employeesStore = new Map();
      workflowsStore = new Map();
      stagedEvents = [];
      currentActor = {
        userId: "u-hr",
        permissions: ["employee:manage", "employee:edit"],
      };

      employeesStore.set("11111111-1111-4111-8111-111111111111", {
        id: "11111111-1111-4111-8111-111111111111",
        userId: "u-emp-1",
        firstName: "Tran",
        lastName: "Binh",
        status: "probation",
        departmentId: "dept-eng",
        deletedAt: null,
      });

      const mockEmployeesRepo = {
        findByIdentifier: jest.fn(async (id: string) => employeesStore.get(id) ?? null),
        findEmployeeById: jest.fn(async (id: string) => employeesStore.get(id) ?? null),
        softDeleteEmployee: jest.fn(async (id: string) => {
          const emp = employeesStore.get(id);
          if (emp) emp.deletedAt = new Date();
        }),
        updateEmployeeById: jest.fn(async (id: string, patch: any) => {
          const emp = employeesStore.get(id);
          if (emp) Object.assign(emp, patch);
        }),
        transaction: jest.fn(async (fn: any) =>
          fn({
            query: {
              orgAssignments: {
                findFirst: jest.fn(async () => ({ id: "assign-old", departmentId: "dept-eng" })),
              },
            },
            update: jest.fn(() => ({
              set: jest.fn(() => ({ where: jest.fn(async () => undefined) })),
            })),
            insert: jest.fn(() => ({
              values: jest.fn(() => ({
                returning: jest.fn(async () => [{ id: "assign-new" }]),
              })),
            })),
          }),
        ),
      };

      const mockLifecycle = {
        changeStatus: jest.fn(async (id: string, dto: any) => {
          const emp = employeesStore.get(id);
          if (!emp) throw new Error("Employee not found");
          if (emp.status === "terminated" && dto.status === "working") {
            throw new Error("Invalid status transition: terminated -> working. Use rehire endpoint.");
          }
          emp.status = dto.status;
          return { id: emp.id, status: emp.status };
        }),
        assertCanRequestTransfer: jest.fn((emp: any) => {
          if (!["working", "probation", "leave"].includes(emp.status)) {
            throw new Error(`Cannot request transfer in ${emp.status} status`);
          }
        }),
        assertCanApplyTransfer: jest.fn(),
        assertOrgRefsAreValid: jest.fn(async () => undefined),
        restoreArchive: jest.fn(async (id: string) => {
          const emp = employeesStore.get(id);
          if (emp) emp.deletedAt = null;
        }),
        rehire: jest.fn(async (id: string, dto: any) => {
          const emp = employeesStore.get(id);
          if (emp) {
            emp.status = dto.status ?? "working";
            emp.deletedAt = null;
            emp.departmentId = dto.departmentId ?? emp.departmentId;
          }
          return { employmentRecordId: "emprec-rehired-1" };
        }),
      };

      const mockWorkflowEngine = {
        startWorkflow: jest.fn(async (input: any) => {
          const existingActive = Array.from(workflowsStore.values()).find(
            (w) => w.subjectId === input.subjectId && w.status === "active",
          );
          if (existingActive) return existingActive;
          const id = `wf-${workflowsStore.size + 1}`;
          const wf = {
            id,
            subjectType: input.subjectType,
            subjectId: input.subjectId,
            status: "active",
            currentState: "initiated",
            metadata: input.metadata,
          };
          workflowsStore.set(id, wf);
          return wf;
        }),
        transition: jest.fn(async (id: string, action: string) => {
          const wf = workflowsStore.get(id);
          if (wf && action === "submit") wf.currentState = "manager_approval";
        }),
        getInstance: jest.fn(async (id: string) => workflowsStore.get(id) ?? null),
        recordTransition: jest.fn(async () => undefined),
        updateInstance: jest.fn(async (id: string, patch: any) => {
          const wf = workflowsStore.get(id);
          if (wf) Object.assign(wf, patch);
        }),
      };

      const mockOutbox = {
        stage: jest.fn(async (event: any) => {
          stagedEvents.push(event);
        }),
      };

      const mockIdentityAdmin = {
        reactivateUser: jest.fn(async () => undefined),
      };

      const mockStorage = {
        archiveOwnerFiles: jest.fn(async () => undefined),
        restoreOwnerFiles: jest.fn(async () => undefined),
      };

      const moduleRef = await Test.createTestingModule({
        providers: [
          ChangeEmployeeStatusUseCase,
          RequestTransferUseCase,
          ApproveTransferUseCase,
          ApplyTransferUseCase,
          RejectTransferUseCase,
          CancelTransferUseCase,
          DeleteEmployeeUseCase,
          RestoreArchivedEmployeeUseCase,
          RehireEmployeeUseCase,
          { provide: EmployeesRepository, useValue: mockEmployeesRepo },
          { provide: EmployeeLifecycleService, useValue: mockLifecycle },
          { provide: PlatformWorkflowEngineService, useValue: mockWorkflowEngine },
          { provide: EventOutboxService, useValue: mockOutbox },
          { provide: RequestContextService, useValue: { get: () => currentActor } },
          { provide: StorageService, useValue: mockStorage },
          { provide: CONTRACTS_TOKENS.IDENTITY_ADMIN_PORT, useValue: mockIdentityAdmin },
        ],
      }).compile();

      changeStatus = moduleRef.get(ChangeEmployeeStatusUseCase);
      requestTransfer = moduleRef.get(RequestTransferUseCase);
      approveTransfer = moduleRef.get(ApproveTransferUseCase);
      applyTransfer = moduleRef.get(ApplyTransferUseCase);
      rejectTransfer = moduleRef.get(RejectTransferUseCase);
      cancelTransfer = moduleRef.get(CancelTransferUseCase);
      deleteEmployee = moduleRef.get(DeleteEmployeeUseCase);
      restoreArchived = moduleRef.get(RestoreArchivedEmployeeUseCase);
      rehireEmployee = moduleRef.get(RehireEmployeeUseCase);
    });

    it("Journey 3 & 4: confirms probation (probation → working) and executes transfer request → manager approve → stage-gated reject/cancel → HR approve → apply", async () => {
      const empId = "11111111-1111-4111-8111-111111111111";

      // Journey 3: Confirm probation -> working
      const confirmed = await changeStatus.execute(empId, {
        status: "working",
        reason: "Passed 60-day probation review",
      });
      expect(confirmed.status).toBe("working");

      // Journey 4A: Request transfer -> manager approve -> non-HR manager blocked from rejecting at hr_approval -> HR rejects
      const req1 = await requestTransfer.execute(empId, {
        toDepartmentId: "dept-product",
        effectiveDate: "2099-01-01",
        reason: "Cross-functional move",
      });
      expect(req1.status).toBe("pending_approval");
      expect(stagedEvents.some((e) => e instanceof EmployeeTransferRequestedEvent)).toBe(true);

      // Manager approves -> moves to hr_approval
      const mgrApproved = await approveTransfer.execute(
        empId,
        req1.workflowInstanceId,
        "manager",
      );
      expect(mgrApproved.newState).toBe("hr_approval");

      // Non-HR manager (only employee:edit) MUST be blocked from rejecting at hr_approval stage
      currentActor = { userId: "u-dept-mgr", permissions: ["employee:edit"] };
      await expect(
        rejectTransfer.execute(empId, req1.workflowInstanceId, "Manager changed mind late"),
      ).rejects.toThrow("Only HR can reject a transfer at the HR approval stage");

      // HR manager (employee:manage) rejects at hr_approval stage
      currentActor = { userId: "u-hr", permissions: ["employee:manage"] };
      const rejected = await rejectTransfer.execute(
        empId,
        req1.workflowInstanceId,
        "Headcount freeze in target department",
      );
      expect(rejected.status).toBe("rejected");
      expect(stagedEvents.some((e) => e instanceof EmployeeTransferCancelledEvent)).toBe(true);

      // Journey 4B: Request second transfer -> cancel before completion
      const req2 = await requestTransfer.execute(empId, {
        toDepartmentId: "dept-design",
        effectiveDate: "2099-02-01",
      });
      const cancelled = await cancelTransfer.execute(
        empId,
        req2.workflowInstanceId,
        "Withdrawn by requester",
      );
      expect(cancelled.status).toBe("cancelled");
      expect(stagedEvents.some((e) => e instanceof EmployeeTransferCancelledEvent)).toBe(true);

      // Journey 4C: Request third transfer -> manager approve -> HR approve -> apply transfer
      const req3 = await requestTransfer.execute(empId, {
        toDepartmentId: "dept-platform",
        effectiveDate: "2026-01-01",
        reason: "Immediate platform team assignment",
      });
      await approveTransfer.execute(empId, req3.workflowInstanceId, "manager");
      const hrApproved = await approveTransfer.execute(empId, req3.workflowInstanceId, "hr");
      expect(hrApproved.newState).toBe("approved");
      expect(hrApproved.applied).toBe(true);
      expect(employeesStore.get(empId).departmentId).toBe("dept-platform");

      // Rejecting an already-approved transfer must fail
      workflowsStore.get(req3.workflowInstanceId).status = "active";
      await expect(
        rejectTransfer.execute(empId, req3.workflowInstanceId, "Too late"),
      ).rejects.toThrow("Transfer request is not awaiting approval");
    });

    it("Journey 5: executes archive → restore on working employee, and termination → archive → blocks restore → rehire", async () => {
      const empId = "11111111-1111-4111-8111-111111111111";
      await changeStatus.execute(empId, { status: "working" });

      // Archive working employee and restore
      await deleteEmployee.execute(empId);
      expect(employeesStore.get(empId).deletedAt).toBeInstanceOf(Date);

      const restored = await restoreArchived.execute(empId);
      expect(restored.success).toBe(true);
      expect(employeesStore.get(empId).deletedAt).toBeNull();

      // Terminate employee
      await changeStatus.execute(empId, {
        status: "terminated",
        reason: "Voluntary resignation",
      });
      expect(employeesStore.get(empId).status).toBe("terminated");

      // Direct status change from terminated -> working must be rejected
      await expect(
        changeStatus.execute(empId, { status: "working" }),
      ).rejects.toThrow("Invalid status transition: terminated -> working");

      // Archive terminated employee
      await deleteEmployee.execute(empId);
      expect(employeesStore.get(empId).deletedAt).toBeInstanceOf(Date);

      // RestoreArchivedEmployeeUseCase must block restoring a terminated employee
      await expect(restoreArchived.execute(empId)).rejects.toThrow(
        "Terminated employees cannot be restored. Use rehire instead.",
      );

      // Rehire terminated employee -> reactivates user, creates new employment record, stages EmployeeRehiredEvent
      const rehired = await rehireEmployee.execute(empId, {
        hireDate: "2026-09-01",
        status: "working",
        departmentId: "dept-eng",
        contractType: "indefinite",
        contractStatus: "active",
        reason: "Boomerang hire",
      });
      expect(rehired).toEqual({
        success: true,
        employeeId: empId,
        status: "working",
        employmentRecordId: "emprec-rehired-1",
      });
      expect(employeesStore.get(empId).status).toBe("working");
      expect(employeesStore.get(empId).deletedAt).toBeNull();
      expect(stagedEvents.some((e) => e instanceof EmployeeRehiredEvent)).toBe(true);
    });
  });

  describe("Journey 6 & 7: Onboarding checklist completion and Leave self-approval guard", () => {
    it("Journey 6: blocks skipping mandatory onboarding item and completes process when all items finish", async () => {
      const stagedEvents: any[] = [];
      const processState = {
        id: "onb-1",
        employeeId: "emp-new",
        type: "onboarding",
        status: "in_progress",
        checklistItems: [
          { id: "item-1", title: "Sign NDA", mandatory: true, status: "pending" },
          { id: "item-2", title: "Setup Workstation", mandatory: false, status: "pending" },
        ],
      };

      const mockProcessRepo = {
        findByIdWithItems: jest.fn(async () => ({
          ...processState,
          checklistItems: processState.checklistItems.map((i) => ({ ...i })),
        })),
        updateChecklistItemStatus: jest.fn(async (itemId: string, status: string) => {
          const item = processState.checklistItems.find((i) => i.id === itemId);
          if (item) item.status = status;
        }),
        updateProcessStatus: jest.fn(async (_id: string, status: string) => {
          processState.status = status;
        }),
      };

      const mod = await Test.createTestingModule({
        providers: [
          CompleteOnboardingTaskUseCase,
          { provide: OnboardingProcessRepository, useValue: mockProcessRepo },
          { provide: RequestContextService, useValue: { get: () => ({ userId: "u-hr" }) } },
          {
            provide: EventOutboxService,
            useValue: { stage: jest.fn(async (e: any) => stagedEvents.push(e)) },
          },
        ],
      }).compile();

      const completeTask = mod.get(CompleteOnboardingTaskUseCase);

      // Skipping mandatory item must fail
      await expect(
        completeTask.execute({ processId: "onb-1", itemId: "item-1", action: "skip" }),
      ).rejects.toThrow("Cannot skip a mandatory onboarding checklist item");

      // Complete mandatory item and skip optional item -> process transitions to completed
      await completeTask.execute({ processId: "onb-1", itemId: "item-1", action: "complete" });
      expect(processState.status).toBe("in_progress");

      await completeTask.execute({ processId: "onb-1", itemId: "item-2", action: "skip" });
      expect(processState.status).toBe("completed");
      expect(stagedEvents.some((e) => e instanceof OnboardingCompletedEvent)).toBe(true);
    });

    it("Journey 7: blocks requester from self-approving a leave approval request and allows manager approval", async () => {
      const stagedEvents: any[] = [];
      const approvalReq = {
        id: "apr-leave-1",
        subjectType: "leave_request",
        subjectId: "leave-101",
        requestedByUserId: "u-requester",
        status: "pending",
        currentStepIndex: 0,
      };
      const approvalStep = {
        id: "step-1",
        requestId: "apr-leave-1",
        stepIndex: 0,
        status: "pending",
        approverUserId: null,
      };

      const mockApprovalRepo = {
        transaction: jest.fn(async (fn: any) => fn({})),
        findRequestById: jest.fn(async () => approvalReq),
        findStep: jest.fn(async () => approvalStep),
        updateStep: jest.fn(async (_id: string, patch: any) => Object.assign(approvalStep, patch)),
        updateRequest: jest.fn(async (_id: string, patch: any) => Object.assign(approvalReq, patch)),
        anyPendingStep: jest.fn(async () => false),
      };

      const mod = await Test.createTestingModule({
        providers: [
          DecideApprovalStepUseCase,
          { provide: PlatformApprovalEngineRepository, useValue: mockApprovalRepo },
          {
            provide: EventOutboxService,
            useValue: { stage: jest.fn(async (e: any) => stagedEvents.push(e)) },
          },
        ],
      }).compile();

      const decideStep = mod.get(DecideApprovalStepUseCase);

      // Self-approval by u-requester must be blocked with 403
      await expect(
        decideStep.execute(
          { requestId: "apr-leave-1", stepIndex: 0, decision: "approve" },
          "u-requester",
        ),
      ).rejects.toThrow("Approvers cannot decide their own approval requests");

      // Manager approval succeeds and completes the approval request
      const res = await decideStep.execute(
        { requestId: "apr-leave-1", stepIndex: 0, decision: "approve", comment: "Approved" },
        "u-manager",
      );
      expect(res.status).toBe("approved");
      expect(approvalReq.status).toBe("approved");
      expect(stagedEvents.some((e) => e instanceof ApprovalRequestCompletedEvent)).toBe(true);
    });
  });

  describe("Journey 10: Payroll provisional calculation and hard runtime block on approve, post, and publish", () => {
    it("marks generated payroll runs and payslips as PROVISIONAL_POLICY_UNCONFIRMED and blocks ApprovePayrollRunUseCase, PostPayrollRunUseCase, and PublishPayslipUseCase", async () => {
      let runRow: any = {
        id: "run-2026-04",
        payrollPeriodId: "period-2026-04",
        branchId: null,
        status: "draft",
        calculationVersionId: "calc-v1",
        calculationHash: "hash-123",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      let generatedPayslips: any[] = [];
      const approvalHistory: any[] = [];

      const mockPayrollRunsRepo = {
        findById: jest.fn(async () => ({
          ...runRow,
          payslips: generatedPayslips,
        })),
        getPayrollPeriodById: jest.fn(async () => ({
          id: "period-2026-04",
          code: "2026-04",
          name: "April 2026",
          startsOn: "2026-04-01",
          endsOn: "2026-04-30",
        })),
        getEmployeesForPayrollRun: jest.fn(async () => [{ id: "emp-101" }]),
        getSalaryByEmployeeForPeriod: jest.fn(
          async () => new Map([["emp-101", { baseSalary: 22000000, currency: "VND" }]]),
        ),
        findActiveCalculationVersion: jest.fn(async () => ({ id: "calc-v1", code: "v1" })),
        transaction: jest.fn(async (fn: any) => fn({})),
        markRunProcessing: jest.fn(async () => [{ id: "run-2026-04" }]),
        getRunInputSnapshotsWithItems: jest.fn(async () => []),
        deleteRunItems: jest.fn(async () => undefined),
        deleteRunPayslips: jest.fn(async () => undefined),
        deleteRunInputSnapshots: jest.fn(async () => undefined),
        createPayslips: jest.fn(async (inputs: any[]) => {
          generatedPayslips = inputs.map((inp, idx) => ({
            id: `ps-${idx + 1}`,
            ...inp,
            createdAt: new Date(),
            updatedAt: new Date(),
          }));
          return generatedPayslips;
        }),
        insertInputSnapshotsBatch: jest.fn(async () => undefined),
        createPayrollItems: jest.fn(async () => undefined),
        update: jest.fn(async (_id: string, patch: any) => {
          Object.assign(runRow, patch);
        }),
        markRunPendingApproval: jest.fn(async () => {
          runRow.status = "pending_approval";
          return [runRow];
        }),
        recordApprovalAction: jest.fn(async (_id: string, action: string, userId: string) => {
          approvalHistory.push({ action, performedByUserId: userId });
        }),
        getApprovalHistory: jest.fn(async () => approvalHistory),
        findPayslipsByRunId: jest.fn(async () => generatedPayslips),
      };

      const mockPayslipsRepo = {
        findById: jest.fn(async () => ({
          ...generatedPayslips[0],
          payrollRun: { id: runRow.id, status: "approved" },
        })),
        transaction: jest.fn(async (fn: any) => fn({})),
      };

      const mod = await Test.createTestingModule({
        providers: [
          GeneratePayrollRunUseCase,
          ApprovePayrollRunUseCase,
          PostPayrollRunUseCase,
          PublishPayslipUseCase,
          PayrollRunStateMachine,
          { provide: PayrollRunsRepository, useValue: mockPayrollRunsRepo },
          { provide: PayslipsRepository, useValue: mockPayslipsRepo },
          {
            provide: CONTRACTS_TOKENS.ATTENDANCE_READ_PORT,
            useValue: { getEffectiveDailySummaries: jest.fn(async () => []) },
          },
          {
            provide: ATTENDANCE_PAY_POLICY,
            useValue: {
              evaluate: jest.fn(() => ({
                payableMinutes: 480,
                payableOvertimeMinutes: 0,
                attendanceOutcome: "present",
              })),
            },
          },
          {
            provide: ATTENDANCE_ADJUSTMENT_READER,
            useValue: { getAdjustmentDeltas: jest.fn(async () => []) },
          },
          { provide: EventOutboxService, useValue: { stage: jest.fn() } },
          { provide: RequestContextService, useValue: { get: () => ({ userId: "u-payroll" }) } },
        ],
      }).compile();

      const generateRun = mod.get(GeneratePayrollRunUseCase);
      const approveRun = mod.get(ApprovePayrollRunUseCase);
      const postRun = mod.get(PostPayrollRunUseCase);
      const publishPayslip = mod.get(PublishPayslipUseCase);

      // 1. Generate payroll run -> DTO and payslip metadata carry provisional flags
      const generatedDto = await generateRun.execute("run-2026-04", "u-payroll-maker");
      expect(generatedDto.status).toBe("pending_approval");
      expect(generatedDto.isProvisional).toBe(true);
      expect(generatedDto.calculationStatus).toBe("PROVISIONAL_POLICY_UNCONFIRMED");
      expect(generatedPayslips[0].metadata).toMatchObject({
        isProvisional: true,
        calculationStatus: "PROVISIONAL_POLICY_UNCONFIRMED",
        policyBlockerCode: "BIZ_004_PAYROLL_POLICY_UNCONFIRMED",
      });

      // 2. Approving a provisional payroll run (even by a distinct approver) is hard-blocked
      await expect(
        approveRun.execute("run-2026-04", "u-payroll-checker", "Attempt approve"),
      ).rejects.toThrow(
        "Provisional payroll run cannot be approved while HR/Finance payroll policies remain unconfirmed",
      );

      // 3. Posting a provisional payroll run is hard-blocked
      runRow.status = "approved";
      runRow.approvedByUserId = "u-payroll-checker";
      approvalHistory.push({ action: "APPROVED", performedByUserId: "u-payroll-checker" });
      await expect(
        postRun.execute("run-2026-04", "u-finance-poster"),
      ).rejects.toThrow(
        "Provisional payroll run cannot be posted while HR/Finance payroll policies remain unconfirmed",
      );

      // 4. Publishing a provisional payslip is hard-blocked
      await expect(
        publishPayslip.execute("ps-1", { status: "published" }),
      ).rejects.toThrow(
        "Provisional final-settlement payslip cannot be published before manual HR/Finance completion of omitted settlement components",
      );
    });
  });
});
