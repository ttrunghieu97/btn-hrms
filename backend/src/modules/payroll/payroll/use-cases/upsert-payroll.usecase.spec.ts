import { UpsertPayrollUseCase } from "./upsert-payroll.usecase";

describe(UpsertPayrollUseCase.name, () => {
  it("stages payroll generated event in outbox instead of publishing directly", async () => {
    const payrollRepo = {
      upsertByEmployeeId: jest.fn().mockResolvedValue({ id: "pay-1", employeeId: "emp-1" }),
      findByEmployeeId: jest.fn().mockResolvedValue({ id: "pay-1", employeeId: "emp-1" }),
      transaction: jest.fn().mockImplementation(async (fn) => fn({})),
    };
    const eventOutbox = {
      stage: jest.fn().mockResolvedValue({ id: "out-1" }),
    };
    const payrollInputPort = {
      getPayrollInputs: jest.fn().mockResolvedValue([]),
    };

    const useCase = new UpsertPayrollUseCase(
      payrollRepo as any,
      eventOutbox as any,
      payrollInputPort as any,
      {} as any,
    );

    await useCase.execute("emp-1", { salary: "1000" });

    expect(payrollRepo.upsertByEmployeeId).toHaveBeenCalled();
    expect(eventOutbox.stage).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "PayrollGeneratedEvent" }),
      expect.anything(),
    );
  });
});
