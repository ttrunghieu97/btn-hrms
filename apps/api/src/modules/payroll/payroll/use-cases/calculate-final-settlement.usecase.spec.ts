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

  it("prorates a mid-month end date by calendar days and explicitly flags the settlement as provisional / incomplete (BIZ-005)", async () => {
    // Leaving on the 15th of a 30-day month => half salary.
    const { useCase, payrollRepo } = build({
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
    expect(result.isProvisional).toBe(true);
    expect(result.settlementComplete).toBe(false);
    expect(result.requiresManualReviewBeforePublish).toBe(true);
    expect(result.policyBlockerCode).toBe(
      "BIZ_005_FINAL_SETTLEMENT_POLICY_UNCONFIRMED",
    );
    expect(result.omittedComponents).toEqual(
      expect.arrayContaining([
        "unused_leave_payout",
        "final_tax_adjustment",
        "statutory_insurance_adjustment",
        "working_day_attendance_proration",
      ]),
    );
    expect(payrollRepo.upsertByEmployeeId).toHaveBeenCalledWith(
      "emp-1",
      expect.objectContaining({
        metadata: expect.objectContaining({
          isProvisional: true,
          settlementComplete: false,
          requiresManualReviewBeforePublish: true,
          policyBlockerCode: "BIZ_005_FINAL_SETTLEMENT_POLICY_UNCONFIRMED",
        }),
      }),
    );
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

  it("persists failed state outside the rolled-back transaction and re-throws the original transaction error (P6F-003)", async () => {
    let inTransaction = false;
    let markFailedCalledInsideTx = false;
    const { useCase, payrollRepo, settlementWriter } = build();

    (payrollRepo as any).transaction = jest.fn(async (fn: any) => {
      inTransaction = true;
      try {
        return await fn({});
      } finally {
        inTransaction = false;
      }
    });
    payrollRepo.upsertByEmployeeId.mockRejectedValueOnce(
      new Error("DB_SETTLEMENT_TX_FAILURE"),
    );
    settlementWriter.markFailed.mockImplementation(async () => {
      markFailedCalledInsideTx = inTransaction;
    });

    await expect(
      useCase.execute({ processId: "proc-tx-fail", employeeId: "emp-1" }),
    ).rejects.toThrow("DB_SETTLEMENT_TX_FAILURE");

    expect(settlementWriter.markProcessing).toHaveBeenCalledWith("proc-tx-fail");
    expect(settlementWriter.markFailed).toHaveBeenCalledWith("proc-tx-fail");
    expect(markFailedCalledInsideTx).toBe(false);
    expect(settlementWriter.markSettled).not.toHaveBeenCalled();
  });

  it("preserves the original transaction error even if markFailed itself throws (P6F-003)", async () => {
    const { useCase, payrollRepo, settlementWriter } = build();
    payrollRepo.upsertByEmployeeId.mockRejectedValueOnce(
      new Error("PRIMARY_SETTLEMENT_DB_ERROR"),
    );
    settlementWriter.markFailed.mockRejectedValueOnce(
      new Error("SECONDARY_MARK_FAILED_ERROR"),
    );

    await expect(
      useCase.execute({ processId: "proc-double-fail", employeeId: "emp-1" }),
    ).rejects.toThrow("PRIMARY_SETTLEMENT_DB_ERROR");

    expect(settlementWriter.markProcessing).toHaveBeenCalledWith("proc-double-fail");
    expect(settlementWriter.markFailed).toHaveBeenCalledWith("proc-double-fail");
    expect(settlementWriter.markSettled).not.toHaveBeenCalled();
  });

  it("supports clean retry after failure and transitions to settled only after transaction commit (P6F-003)", async () => {
    const { useCase, payrollRepo, settlementWriter } = build({
      payrollRow: { id: "payslip-retry-ok" },
    });
    const callOrder: string[] = [];
    settlementWriter.markProcessing.mockImplementation(async () => {
      callOrder.push("markProcessing");
    });
    settlementWriter.markFailed.mockImplementation(async () => {
      callOrder.push("markFailed");
    });
    settlementWriter.markSettled.mockImplementation(async () => {
      callOrder.push("markSettled");
    });
    (payrollRepo as any).transaction = jest.fn(async (fn: any) => {
      callOrder.push("txStart");
      const res = await fn({});
      callOrder.push("txCommit");
      return res;
    });

    // Attempt 1 fails mid-transaction
    payrollRepo.upsertByEmployeeId.mockRejectedValueOnce(
      new Error("TRANSIENT_DEADLOCK"),
    );
    await expect(
      useCase.execute({ processId: "proc-retry-1", employeeId: "emp-1" }),
    ).rejects.toThrow("TRANSIENT_DEADLOCK");

    // Attempt 2 (retry) succeeds after commit
    const retryResult = await useCase.execute({
      processId: "proc-retry-1",
      employeeId: "emp-1",
    });
    expect(retryResult.status).toBe("settled");
    expect(retryResult.payrollRef).toBe("payslip-retry-ok");
    expect(callOrder).toEqual([
      "markProcessing",
      "txStart",
      "markFailed",
      "markProcessing",
      "txStart",
      "txCommit",
      "markSettled",
    ]);
  });
});
