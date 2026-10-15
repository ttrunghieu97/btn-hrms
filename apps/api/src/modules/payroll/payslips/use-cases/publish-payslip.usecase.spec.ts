import { PublishPayslipUseCase } from "./publish-payslip.usecase";

describe(PublishPayslipUseCase.name, () => {
  it("stages payslip published event inside the update transaction", async () => {
    const tx = { tx: true };
    const existing = {
      id: "payslip-1",
      employeeId: "emp-1",
      payrollRunId: "run-1",
      status: "draft",
      metadata: {},
    };
    const payslipsRepo = {
      findById: jest.fn().mockResolvedValue(existing),
      update: jest.fn().mockResolvedValue({ ...existing, status: "published" }),
      transaction: jest.fn().mockImplementation(async (fn) => fn(tx)),
    };
    const eventOutbox = {
      stage: jest.fn().mockResolvedValue({ id: "out-1" }),
    };
    const useCase = new PublishPayslipUseCase(
      payslipsRepo as any,
      { get: jest.fn().mockReturnValue({}) } as any,
      eventOutbox as any,
    );

    await useCase.execute("payslip-1", { status: "published" });

    expect(payslipsRepo.transaction).toHaveBeenCalled();
    expect(payslipsRepo.update).toHaveBeenCalledWith(
      "payslip-1",
      expect.objectContaining({ status: "published" }),
      tx,
    );
    expect(eventOutbox.stage).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "payroll.payslip.published.v1" }),
      tx,
    );
  });

  it("blocks publishing a provisional final-settlement payslip before manual HR/Finance completion (BIZ-005)", async () => {
    const provisionalPayslip = {
      id: "payslip-settlement-1",
      employeeId: "emp-1",
      payrollRunId: "run-1",
      status: "draft",
      metadata: {
        source: "offboarding-final-settlement",
        isProvisional: true,
        settlementComplete: false,
        requiresManualReviewBeforePublish: true,
        policyBlockerCode: "BIZ_005_FINAL_SETTLEMENT_POLICY_UNCONFIRMED",
        omittedComponents: [
          "unused_leave_payout",
          "final_tax_adjustment",
          "statutory_insurance_adjustment",
          "working_day_attendance_proration",
        ],
      },
    };
    const payslipsRepo = {
      findById: jest.fn().mockResolvedValue(provisionalPayslip),
      update: jest.fn(),
      transaction: jest.fn(),
    };
    const eventOutbox = { stage: jest.fn() };
    const useCase = new PublishPayslipUseCase(
      payslipsRepo as any,
      { get: jest.fn().mockReturnValue({}) } as any,
      eventOutbox as any,
    );

    await expect(
      useCase.execute("payslip-settlement-1", { status: "published" }),
    ).rejects.toThrow(
      "Provisional final-settlement payslip cannot be published before manual HR/Finance completion",
    );
    expect(payslipsRepo.transaction).not.toHaveBeenCalled();
    expect(payslipsRepo.update).not.toHaveBeenCalled();
    expect(eventOutbox.stage).not.toHaveBeenCalled();
  });

  it("blocks publishing a provisional regular payroll payslip while HR/Finance policies remain unconfirmed (BIZ-004)", async () => {
    const provisionalRunPayslip = {
      id: "payslip-run-1",
      employeeId: "emp-1",
      payrollRunId: "run-1",
      status: "draft",
      metadata: {
        calculationStatus: "PROVISIONAL_POLICY_UNCONFIRMED",
        policyBlockerCode: "BIZ_004_PAYROLL_POLICY_UNCONFIRMED",
        unconfirmedPolicyComponents: [
          "tax_amount",
          "statutory_insurance_amount",
          "allowance_components",
        ],
      },
    };
    const payslipsRepo = {
      findById: jest.fn().mockResolvedValue(provisionalRunPayslip),
      update: jest.fn(),
      transaction: jest.fn(),
    };
    const eventOutbox = { stage: jest.fn() };
    const useCase = new PublishPayslipUseCase(
      payslipsRepo as any,
      { get: jest.fn().mockReturnValue({}) } as any,
      eventOutbox as any,
    );

    await expect(
      useCase.execute("payslip-run-1", { status: "published" }),
    ).rejects.toThrow(
      "Provisional payroll payslip cannot be published while HR/Finance payroll policies remain unconfirmed",
    );
    expect(payslipsRepo.transaction).not.toHaveBeenCalled();
    expect(payslipsRepo.update).not.toHaveBeenCalled();
    expect(eventOutbox.stage).not.toHaveBeenCalled();
  });
});
