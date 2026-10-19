import { UpdateMyProfileUseCase } from "./update-my-profile.usecase";

describe("UpdateMyProfileUseCase", () => {
  const employeesRepo = {
    findEmployeeByUserId: jest.fn(),
    transaction: jest.fn(async (cb: (tx: unknown) => Promise<unknown>) => cb({})),
    updateEmployeeById: jest.fn(),
  };
  const getEmployee = {
    execute: jest.fn(),
  };
  const requestContext = {
    get: jest.fn().mockReturnValue({ userId: "u-emp", traceId: "t-profile" }),
  };

  const useCase = new UpdateMyProfileUseCase(
    employeesRepo as never,
    getEmployee as never,
    requestContext as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    employeesRepo.transaction.mockImplementation(
      async (cb: (tx: unknown) => Promise<unknown>) => cb({}),
    );
  });

  it("throws 404 NotFound when employee profile does not exist for userId", async () => {
    employeesRepo.findEmployeeByUserId.mockResolvedValue(null);

    await expect(
      useCase.execute("u-404", { phoneNumber: "0901234567" }),
    ).rejects.toThrow(/Employee profile not found/i);
  });

  it("throws 400 BadRequest when employee is terminated or archived", async () => {
    employeesRepo.findEmployeeByUserId.mockResolvedValue({
      id: "emp-term",
      status: "terminated",
      deletedAt: null,
    });

    await expect(
      useCase.execute("u-term", { phoneNumber: "0901234567" }),
    ).rejects.toThrow(/terminated or archived/i);
  });

  it("updates contact fields while ignoring masked sensitive values (••••••••)", async () => {
    employeesRepo.findEmployeeByUserId.mockResolvedValue({
      id: "emp-1",
      status: "working",
      deletedAt: null,
    });
    getEmployee.execute.mockResolvedValue({
      id: "emp-1",
      phoneNumber: "0909888777",
      address: "District 1, HCMC",
    });

    const result = await useCase.execute("u-emp", {
      phoneNumber: "0909888777",
      address: "District 1, HCMC",
      bankName: "Vietcombank",
      bankAccountNumber: "••••••••1234",
      taxCode: "8400112233",
    });

    expect(employeesRepo.updateEmployeeById).toHaveBeenCalledWith(
      "emp-1",
      expect.objectContaining({
        phoneNumber: "0909888777",
        address: "District 1, HCMC",
        bankName: "Vietcombank",
        taxCode: "8400112233",
      }),
      expect.anything(),
    );
    const updatePayload = employeesRepo.updateEmployeeById.mock.calls[0]?.[1];
    expect(updatePayload).not.toHaveProperty("bankAccountNumber");
    expect(getEmployee.execute).toHaveBeenCalledWith("emp-1", undefined, true);
    expect(result.phoneNumber).toBe("0909888777");
  });
});
