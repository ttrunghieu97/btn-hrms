import { GeneratePayrollRunUseCase } from "./payroll-runs.usecases";

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
      { getBatchPayrollInputs: jest.fn() } as any,
      { getEffectiveDailySummaries: jest.fn().mockResolvedValue([]) },
      { evaluate: jest.fn() },
      { stage: jest.fn() } as any,
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
      getAttendanceSummariesByEmployee: jest.fn().mockResolvedValue(new Map([["emp-1", []]])),
      transaction: jest.fn().mockImplementation(async (fn) => fn({})),
      markRunProcessing: jest.fn(),
      deleteRunItems: jest.fn(),
      deleteRunPayslips: jest.fn(),
      createPayslips: jest.fn().mockResolvedValue([{ id: "payslip-1", employeeId: "emp-1" }]),
      createPayrollItems: jest.fn(),
      markRunApproved: jest.fn(),
      markRunPendingApproval: jest.fn(),
    };
    const payrollInputPort = {
      getPayrollInputs: jest.fn().mockResolvedValue([]),
      getBatchPayrollInputs: jest.fn().mockResolvedValue(new Map()),
    };
    const eventOutbox = {
      stage: jest.fn().mockResolvedValue({ id: "out-1" }),
    };

    const useCase = new GeneratePayrollRunUseCase(
      repo as any,
      payrollInputPort as any,
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
      eventOutbox as any,
    );

    await useCase.execute("run-1");

    expect(eventOutbox.stage).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "PayrollGeneratedEvent" }),
      expect.anything(),
    );
  });
});
