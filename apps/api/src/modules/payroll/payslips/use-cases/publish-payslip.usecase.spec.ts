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
});
