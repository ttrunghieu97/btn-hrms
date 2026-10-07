import { CalculateFinalSettlementUseCase } from "./calculate-final-settlement.usecase";

describe(CalculateFinalSettlementUseCase.name, () => {
  const mockRequestContext = {
    get: jest.fn().mockReturnValue({ requestId: "rid", userId: "u" }),
  };

  function build(overrides: {
    salaryStructure?: any;
    employee?: any;
    payrollRow?: any;
  } = {}) {
    const payrollRepo = {
      getCurrentSalaryStructureByEmployeeId: jest
        .fn()
        .mockResolvedValue(
          "salaryStructure" in overrides
            ? overrides.salaryStructure
            : { baseSalary: "3000000", currency: "VND" },
        ),
      upsertByEmployeeId: jest
        .fn()
        .mockResolvedValue(overrides.payrollRow ?? { id: "payslip-1" }),
    };
    const employeeReader = {
      findEmployeeById: jest
        .fn()
        .mockResolvedValue(
          "employee" in overrides
            ? overrides.employee
            : { id: "emp-1", endDate: "2026-06-30" },
        ),
    };
    const settlementWriter = {
      markProcessing: jest.fn().mockResolvedValue(undefined),
      markSettled: jest.fn().mockResolvedValue(undefined),
      markFailed: jest.fn().mockResolvedValue(undefined),
    };
    const useCase = new CalculateFinalSettlementUseCase(
      payrollRepo as any,
      employeeReader as any,
      settlementWriter,
      mockRequestContext as any,
    );
    return { useCase, payrollRepo, employeeReader, settlementWriter };
  }

  it("marks processing, prorates salary to the end date, and marks settled with the payroll ref", async () => {
    const { useCase, payrollRepo, settlementWriter } = build({
      // 30/30 days of June => full base salary
      employee: { id: "emp-1", endDate: "2026-06-30" },
      salaryStructure: { baseSalary: "3000000", currency: "VND" },
      payrollRow: { id: "payslip-xyz" },
    });

    const result = await useCase.execute({
      processId: "proc-1",
      employeeId: "emp-1",
    });

    expect(settlementWriter.markProcessing).toHaveBeenCalledWith("proc-1");
    expect(result.status).toBe("settled");
    expect(result.daysWorked).toBe(30);
    expect(result.daysInMonth).toBe(30);
    expect(result.proratedSalary).toBe(3000000);
    expect(result.payrollRef).toBe("payslip-xyz");

    // Persisted as a draft payslip for the final partial month.
    expect(payrollRepo.upsertByEmployeeId).toHaveBeenCalledWith(
      "emp-1",
      expect.objectContaining({
        salary: "3000000",
        netSalary: "3000000",
        currency: "VND",
        effectiveFrom: "2026-06-01",
        effectiveTo: "2026-06-30",
      }),
    );
    expect(settlementWriter.markSettled).toHaveBeenCalledWith(
      "proc-1",
      "payslip-xyz",
    );
    expect(settlementWriter.markFailed).not.toHaveBeenCalled();
  });

  it("prorates a mid-month end date by calendar days", async () => {
    // Leaving on the 15th of a 30-day month => half salary.
    const { useCase } = build({
      employee: { id: "emp-1", endDate: "2026-06-15" },
      salaryStructure: { baseSalary: "3000000", currency: "VND" },
    });

    const result = await useCase.execute({
      processId: "proc-2",
      employeeId: "emp-1",
    });

    expect(result.daysWorked).toBe(15);
    expect(result.daysInMonth).toBe(30);
    expect(result.proratedSalary).toBe(1500000);
  });

  it("marks the settlement failed when the employee has no current salary structure", async () => {
    const { useCase, payrollRepo, settlementWriter } = build({
      salaryStructure: null,
    });

    const result = await useCase.execute({
      processId: "proc-3",
      employeeId: "emp-1",
    });

    expect(result.status).toBe("failed");
    expect(settlementWriter.markProcessing).toHaveBeenCalledWith("proc-3");
    expect(settlementWriter.markFailed).toHaveBeenCalledWith("proc-3");
    expect(settlementWriter.markSettled).not.toHaveBeenCalled();
    expect(payrollRepo.upsertByEmployeeId).not.toHaveBeenCalled();
  });
});
