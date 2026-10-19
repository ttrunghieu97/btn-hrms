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
      markRunPendingApproval: jest.fn().mockResolvedValue([{ id: "run-1" }]),
      recordApprovalAction: jest.fn().mockResolvedValue(undefined),
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

    await useCase.execute("run-1", "user-maker");

    expect(repo.createPayslips).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          employeeId: "emp-1",
          status: "draft",
          metadata: expect.objectContaining({
            calculationStatus: "PROVISIONAL_POLICY_UNCONFIRMED",
            policyBlockerCode: "BIZ_004_PAYROLL_POLICY_UNCONFIRMED",
            unconfirmedPolicyComponents: expect.arrayContaining([
              "tax_amount",
              "statutory_insurance_amount",
              "allowance_components",
              "overtime_day_type_multipliers",
              "standard_working_divisor",
              "mid_period_salary_proration",
            ]),
          }),
        }),
      ],
      expect.anything(),
    );
    expect(repo.recordApprovalAction).toHaveBeenCalledWith(
      "run-1",
      "REQUESTED",
      "user-maker",
      null,
      expect.anything(),
    );
    expect(eventOutbox.stage).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "PayrollGeneratedEvent" }),
      expect.anything(),
    );
  });

  it("rejects generation when requester identity is missing or 'system'", async () => {
    const repo = {
      findById: jest.fn().mockResolvedValue({
        id: "run-1",
        payrollPeriodId: "period-1",
        branchId: null,
        status: "draft",
      }),
      transaction: jest.fn(),
      recordApprovalAction: jest.fn(),
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
      "Approval requester identity is required to enforce Segregation of Duties",
    );
    await expect(useCase.execute("run-1", "system")).rejects.toThrow(
      "Approval requester identity is required to enforce Segregation of Duties",
    );
    expect(repo.transaction).not.toHaveBeenCalled();
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
      recordApprovalAction: jest.fn(),
    };

    const useCase = new GeneratePayrollRunUseCase(
      repo as any,
      { getEffectiveDailySummaries: jest.fn().mockResolvedValue([]) },
      { evaluate: jest.fn() },
      { getAdjustmentDeltas: jest.fn().mockResolvedValue([]) },
      { stage: jest.fn() } as any,
      { canTransition: jest.fn().mockReturnValue(true) } as any,
    );

    await expect(useCase.execute("run-1", "user-maker")).rejects.toThrow(
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

  it("permits approval when approver is different from the requester and payslips are non-provisional", async () => {
    const repo = {
      findById: jest.fn().mockResolvedValue({ id: "run-1", status: "pending_approval" }),
      getApprovalHistory: jest.fn().mockResolvedValue([
        { action: "REQUESTED", performedByUserId: "user-alice" },
      ]),
      findPayslipsByRunId: jest.fn().mockResolvedValue([
        { id: "ps-1", employeeId: "emp-1", status: "draft", metadata: { calculationStatus: "CONFIRMED" } },
      ]),
      transaction: jest.fn().mockImplementation(async (fn) => fn({})),
      updateStatusWithGuard: jest.fn().mockResolvedValue(true),
      recordApprovalAction: jest.fn().mockResolvedValue(undefined),
    };
    const stateMachine = new PayrollRunStateMachine();
    const eventOutbox = { stage: jest.fn() };
    const { ApprovePayrollRunUseCase } = require("./payroll-runs.usecases");
    const useCase = new ApprovePayrollRunUseCase(repo as any, stateMachine, eventOutbox as any);

    await useCase.execute("run-1", "user-bob");
    expect(repo.recordApprovalAction).toHaveBeenCalledWith("run-1", "APPROVED", "user-bob", null, expect.anything());
  });

  it("blocks approving or posting a payroll run whose payslips are provisional (BIZ-004 / BIZ-005)", async () => {
    const provisionalPayslips = [
      {
        id: "ps-prov-1",
        employeeId: "emp-1",
        status: "draft",
        metadata: {
          calculationStatus: "PROVISIONAL_POLICY_UNCONFIRMED",
          policyBlockerCode: "BIZ_004_PAYROLL_POLICY_UNCONFIRMED",
          unconfirmedPolicyComponents: ["tax_amount", "statutory_insurance_amount"],
        },
      },
    ];
    const repo = {
      findById: jest.fn().mockResolvedValue({
        id: "run-prov-1",
        status: "pending_approval",
        calculationVersionId: "v1",
        calculationHash: "abc12345",
      }),
      getApprovalHistory: jest.fn().mockResolvedValue([
        { action: "REQUESTED", performedByUserId: "user-alice" },
      ]),
      findPayslipsByRunId: jest.fn().mockResolvedValue(provisionalPayslips),
      transaction: jest.fn(),
    };
    const stateMachine = new PayrollRunStateMachine();
    const eventOutbox = { stage: jest.fn() };
    const { ApprovePayrollRunUseCase, PostPayrollRunUseCase } = require("./payroll-runs.usecases");

    const approveUseCase = new ApprovePayrollRunUseCase(repo as any, stateMachine, eventOutbox as any);
    await expect(approveUseCase.execute("run-prov-1", "user-bob")).rejects.toThrow(
      "Provisional payroll run cannot be approved while HR/Finance payroll policies remain unconfirmed",
    );
    expect(repo.transaction).not.toHaveBeenCalled();

    repo.findById.mockResolvedValue({
      id: "run-prov-1",
      status: "approved",
      calculationVersionId: "v1",
      calculationHash: "abc12345",
    });
    const postUseCase = new PostPayrollRunUseCase(repo as any, stateMachine, eventOutbox as any);
    await expect(postUseCase.execute("run-prov-1", "user-bob")).rejects.toThrow(
      "Provisional payroll run cannot be posted while HR/Finance payroll policies remain unconfirmed",
    );
    expect(repo.transaction).not.toHaveBeenCalled();
  });

  it("cannot bypass provisional guards by clearing mutable notes or setting payslip metadata to {} or null", async () => {
    const stateMachine = new PayrollRunStateMachine();
    const eventOutbox = { stage: jest.fn() };
    const {
      ApprovePayrollRunUseCase,
      PostPayrollRunUseCase,
      assertPayrollRunReadyForExportOrPayment,
    } = require("./payroll-runs.usecases");

    for (const tamperedMetadata of [{}, null, undefined, { notes: "" }]) {
      const repo = {
        findById: jest.fn().mockResolvedValue({
          id: "run-tampered-1",
          status: "pending_approval",
          notes: null, // mutable notes cleared!
          calculationVersionId: "v1",
          calculationHash: "abc12345",
        }),
        getApprovalHistory: jest.fn().mockResolvedValue([
          { action: "REQUESTED", performedByUserId: "user-alice" },
        ]),
        findPayslipsByRunId: jest.fn().mockResolvedValue([
          {
            id: "ps-tampered-1",
            employeeId: "emp-1",
            status: "draft",
            metadata: tamperedMetadata,
          },
        ]),
        transaction: jest.fn(),
      };

      const approveUseCase = new ApprovePayrollRunUseCase(repo as any, stateMachine, eventOutbox as any);
      await expect(approveUseCase.execute("run-tampered-1", "user-bob")).rejects.toThrow(
        "Provisional payroll run cannot be approved while HR/Finance payroll policies remain unconfirmed",
      );

      repo.findById.mockResolvedValue({
        id: "run-tampered-1",
        status: "approved",
        notes: "Manually marked confirmed in notes",
        calculationVersionId: "v1",
        calculationHash: "abc12345",
      });
      const postUseCase = new PostPayrollRunUseCase(repo as any, stateMachine, eventOutbox as any);
      await expect(postUseCase.execute("run-tampered-1", "user-bob")).rejects.toThrow(
        "Provisional payroll run cannot be posted while HR/Finance payroll policies remain unconfirmed",
      );

      await expect(
        assertPayrollRunReadyForExportOrPayment(
          "run-tampered-1",
          {
            id: "run-tampered-1",
            status: "posted",
            notes: null,
            calculationVersionId: "v1",
            calculationHash: "abc12345",
          },
          repo as any,
        ),
      ).rejects.toThrow(
        "Provisional payroll run cannot be exported or submitted for payment while HR/Finance payroll policies remain unconfirmed",
      );
    }
  });

  it("blocks payroll period finalization (closing), export/payment submission, and financial publication event staging while payroll is provisional", async () => {
    const {
      assertPayrollRunReadyForExportOrPayment,
    } = require("./payroll-runs.usecases");
    const {
      UpdatePayrollPeriodUseCase,
    } = require("../../payroll-periods/use-cases/update-payroll-period.usecase");
    const {
      EventOutboxService,
    } = require("../../../../core/events/event-outbox.service");

    // 1. Export / payment integration readiness blocks unposted or provisional runs
    const repo = {
      findPayslipsByRunId: jest.fn().mockResolvedValue([
        {
          id: "ps-prov-1",
          employeeId: "emp-1",
          status: "draft",
          metadata: {
            calculationStatus: "PROVISIONAL_POLICY_UNCONFIRMED",
            isProvisional: true,
          },
        },
      ]),
    };

    await expect(
      assertPayrollRunReadyForExportOrPayment(
        "run-1",
        {
          id: "run-1",
          status: "approved",
          calculationVersionId: "v1",
          calculationHash: "hash-1",
        },
        repo as any,
      ),
    ).rejects.toThrow(
      "Payroll run in 'approved' status cannot be exported as final or submitted to payment integration; run must be 'posted'",
    );

    await expect(
      assertPayrollRunReadyForExportOrPayment(
        "run-1",
        {
          id: "run-1",
          status: "posted",
          calculationVersionId: "v1",
          calculationHash: "hash-1",
        },
        repo as any,
      ),
    ).rejects.toThrow(
      "Provisional payroll run cannot be exported or submitted for payment while HR/Finance payroll policies remain unconfirmed",
    );

    // 2. Period finalization (status -> 'closed') is blocked when period has provisional or unposted runs
    const periodRepo = {
      findById: jest.fn().mockResolvedValue({
        id: "period-1",
        startsOn: "2026-04-01",
        endsOn: "2026-04-30",
        status: "open",
      }),
      findRunsWithPayslipsByPeriodId: jest.fn().mockResolvedValue([
        {
          id: "run-prov-1",
          status: "pending_approval",
          payslips: [
            {
              id: "ps-prov-1",
              metadata: {
                calculationStatus: "PROVISIONAL_POLICY_UNCONFIRMED",
                isProvisional: true,
              },
            },
          ],
        },
      ]),
      update: jest.fn(),
    };
    const updatePeriodUseCase = new UpdatePayrollPeriodUseCase(
      periodRepo as any,
      { get: jest.fn().mockReturnValue({}) } as any,
    );
    await expect(
      updatePeriodUseCase.execute("period-1", { status: "closed" }),
    ).rejects.toThrow(
      "Cannot close or finalize payroll period while it contains provisional payroll runs or unconfirmed payslips",
    );
    expect(periodRepo.update).not.toHaveBeenCalled();

    // 3. EventOutboxService blocks staging financial publication events with provisional payload
    const outboxInsert = jest.fn();
    const outboxService = new EventOutboxService(
      { get: jest.fn().mockReturnValue({ requestId: "req-1" }) } as any,
      { insert: outboxInsert } as any,
      { incrementOutboxEventsCreated: jest.fn() } as any,
      {
        current: jest.fn().mockReturnValue({
          traceId: "t1",
          spanId: "s1",
          parentSpanId: null,
          correlationId: "c1",
        }),
      } as any,
    );

    await expect(
      outboxService.stage({
        eventType: "payroll.financial-publication.completed.v1",
        eventVersion: 1,
        producerContext: "payroll",
        payload: {
          payrollRunId: "run-prov-1",
          publicationReference: "BANK-BATCH-001",
          scopeId: "company:default",
          isProvisional: true,
          calculationStatus: "PROVISIONAL_POLICY_UNCONFIRMED",
        },
      }),
    ).rejects.toThrow(
      "Cannot stage payroll release or financial publication event 'payroll.financial-publication.completed.v1' while calculation remains provisional",
    );
    expect(outboxInsert).not.toHaveBeenCalled();
  });
});
