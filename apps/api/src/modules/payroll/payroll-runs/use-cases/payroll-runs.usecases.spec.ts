import {
  GeneratePayrollRunUseCase,
  CreatePayrollRunUseCase,
  UpdatePayrollRunUseCase,
} from "./payroll-runs.usecases";
import { PayrollRunStateMachine } from "../services/payroll-run-state-machine";

describe(GeneratePayrollRunUseCase.name, () => {
  it("rejects regeneration for approved payroll runs", async () => {
    const repo = {
      findById: jest.fn().mockResolvedValue({
        id: "run-1",
        payrollPeriodId: "period-1",
        branchId: null,
        status: "approved",
      }),
      transaction: jest.fn(),
    };
    const useCase = new GeneratePayrollRunUseCase(
      repo as any,
      { getEffectiveDailySummaries: jest.fn().mockResolvedValue([]) },
      { evaluate: jest.fn() },
      { getAdjustmentDeltas: jest.fn().mockResolvedValue([]) },
      { stage: jest.fn() } as any,
      { canTransition: jest.fn().mockReturnValue(true) } as any,
    );

    await expect(useCase.execute("run-1")).rejects.toThrow(
      "Payroll run cannot be regenerated after approval",
    );
    expect(repo.transaction).not.toHaveBeenCalled();
  });

  it("stages payroll generated events to outbox inside the transaction", async () => {
    const repo = {
      findById: jest.fn().mockResolvedValue({ id: "run-1", payrollPeriodId: "period-1", branchId: null }),
      getPayrollPeriodById: jest.fn().mockResolvedValue({ id: "period-1", companyId: "company-1", startsOn: "2026-04-01", endsOn: "2026-04-30" }),
      getEmployeesForPayrollRun: jest.fn().mockResolvedValue([{ id: "emp-1" }]),
      getCurrentSalaryByEmployee: jest.fn().mockResolvedValue(new Map([["emp-1", { baseSalary: 1000, currency: "VND" }]])),
      getSalaryByEmployeeForPeriod: jest.fn().mockResolvedValue(new Map([["emp-1", { baseSalary: 1000, currency: "VND" }]])),
      findActiveCalculationVersion: jest.fn().mockResolvedValue({ id: "v1", code: "v1" }),
      insertInputSnapshot: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      transaction: jest.fn().mockImplementation(async (fn) => fn({})),
      markRunProcessing: jest.fn().mockResolvedValue([{ id: "run-1" }]),
      deleteRunItems: jest.fn(),
      deleteRunPayslips: jest.fn(),
      createPayslips: jest.fn().mockResolvedValue([{ id: "payslip-1", employeeId: "emp-1" }]),
      createPayrollItems: jest.fn(),
      markRunApproved: jest.fn(),
      markRunPendingApproval: jest.fn(),
    };
    const eventOutbox = {
      stage: jest.fn().mockResolvedValue({ id: "out-1" }),
    };

    const useCase = new GeneratePayrollRunUseCase(
      repo as any,
      { getEffectiveDailySummaries: jest.fn().mockResolvedValue([]) },
      {
        evaluate: jest.fn().mockImplementation((summary) => ({
          payableMinutes: summary.workedMinutes ?? 0,
          payableOvertimeMinutes: summary.overtimeMinutes ?? 0,
          payableDayFraction: 1,
          blockedReasons: [],
          attendanceOutcome: "present",
        })),
      },
      { getAdjustmentDeltas: jest.fn().mockResolvedValue([]) },
      eventOutbox as any,
      { canTransition: jest.fn().mockReturnValue(true) } as any,
    );

    await useCase.execute("run-1");

    expect(eventOutbox.stage).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "PayrollGeneratedEvent" }),
      expect.anything(),
    );
  });

  it("rejects concurrent generation when run is already being processed", async () => {
    const repo = {
      findById: jest.fn().mockResolvedValue({ id: "run-1", payrollPeriodId: "period-1", branchId: null, status: "draft" }),
      getPayrollPeriodById: jest.fn().mockResolvedValue({ id: "period-1", startsOn: "2026-04-01", endsOn: "2026-04-30" }),
      getEmployeesForPayrollRun: jest.fn().mockResolvedValue([]),
      getCurrentSalaryByEmployee: jest.fn().mockResolvedValue(new Map()),
      getSalaryByEmployeeForPeriod: jest.fn().mockResolvedValue(new Map()),
      findActiveCalculationVersion: jest.fn().mockResolvedValue(null),
      transaction: jest.fn().mockImplementation(async (fn) => fn({})),
      markRunProcessing: jest.fn().mockResolvedValue([]), // concurrent clash!
    };

    const useCase = new GeneratePayrollRunUseCase(
      repo as any,
      { getEffectiveDailySummaries: jest.fn().mockResolvedValue([]) },
      { evaluate: jest.fn() },
      { getAdjustmentDeltas: jest.fn().mockResolvedValue([]) },
      { stage: jest.fn() } as any,
      { canTransition: jest.fn().mockReturnValue(true) } as any,
    );

    await expect(useCase.execute("run-1")).rejects.toThrow(
      "Payroll run is currently being processed or its status was changed concurrently",
    );
  });
});

describe(CreatePayrollRunUseCase.name, () => {
  it("rejects duplicate payroll run for the same period and company/branch scope", async () => {
    const repo = {
      findByPeriodAndBranch: jest.fn().mockResolvedValue({ id: "existing-run-id" }),
      create: jest.fn(),
    };
    const useCase = new CreatePayrollRunUseCase(repo as any);

    await expect(
      useCase.execute({
        payrollPeriodId: "period-1",
        branchId: null,
      } as any),
    ).rejects.toThrow("A payroll run already exists for this period and branch scope");

    expect(repo.create).not.toHaveBeenCalled();
  });
});

describe(UpdatePayrollRunUseCase.name, () => {
  it("rejects modifications when payroll run is posted (terminal state)", async () => {
    const repo = {
      findById: jest.fn().mockResolvedValue({ id: "run-1", status: "posted" }),
      update: jest.fn(),
    };
    const stateMachine = new PayrollRunStateMachine();
    const useCase = new UpdatePayrollRunUseCase(repo as any, stateMachine);

    await expect(
      useCase.execute("run-1", { status: "draft" } as any),
    ).rejects.toThrow("Posted payroll run is immutable");

    expect(repo.update).not.toHaveBeenCalled();
  });

  it("rejects invalid status transitions", async () => {
    const repo = {
      findById: jest.fn().mockResolvedValue({ id: "run-1", status: "draft" }),
      update: jest.fn(),
    };
    const stateMachine = new PayrollRunStateMachine();
    const useCase = new UpdatePayrollRunUseCase(repo as any, stateMachine);

    await expect(
      useCase.execute("run-1", { status: "approved" } as any),
    ).rejects.toThrow("Invalid payroll run transition: draft → approved");

    expect(repo.update).not.toHaveBeenCalled();
  });
});

describe("ApprovePayrollRunUseCase (Segregation of Duties)", () => {
  it("rejects self-approval when approver is the same user who requested approval", async () => {
    const repo = {
      findById: jest.fn().mockResolvedValue({ id: "run-1", status: "pending_approval" }),
      getApprovalHistory: jest.fn().mockResolvedValue([
        { action: "REQUESTED", performedByUserId: "user-alice" },
      ]),
      transaction: jest.fn(),
    };
    const stateMachine = new PayrollRunStateMachine();
    const eventOutbox = { stage: jest.fn() };
    const { ApprovePayrollRunUseCase } = require("./payroll-runs.usecases");
    const useCase = new ApprovePayrollRunUseCase(repo as any, stateMachine, eventOutbox as any);

    await expect(useCase.execute("run-1", "user-alice")).rejects.toThrow(
      "Người yêu cầu phê duyệt không được tự phê duyệt bảng lương",
    );
    expect(repo.transaction).not.toHaveBeenCalled();
  });

  it("permits approval when approver is different from the requester", async () => {
    const repo = {
      findById: jest.fn().mockResolvedValue({ id: "run-1", status: "pending_approval" }),
      getApprovalHistory: jest.fn().mockResolvedValue([
        { action: "REQUESTED", performedByUserId: "user-alice" },
      ]),
      transaction: jest.fn().mockImplementation(async (fn) => fn({})),
      updateStatusWithGuard: jest.fn().mockResolvedValue(true),
      recordApprovalAction: jest.fn().mockResolvedValue(undefined),
    };
    const stateMachine = new PayrollRunStateMachine();
    const eventOutbox = { stage: jest.fn() };
    const { ApprovePayrollRunUseCase } = require("./payroll-runs.usecases");
    const useCase = new ApprovePayrollRunUseCase(repo as any, stateMachine, eventOutbox as any);

    const result = await useCase.execute("run-1", "user-bob");
    expect(repo.recordApprovalAction).toHaveBeenCalledWith("run-1", "APPROVED", "user-bob", null, expect.anything());
  });
});
