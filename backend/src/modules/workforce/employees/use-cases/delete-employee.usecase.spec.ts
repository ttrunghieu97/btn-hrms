import { DeleteEmployeeUseCase } from "./delete-employee.usecase";

describe(DeleteEmployeeUseCase.name, () => {
  it("deletes employee and associated user by username", async () => {
    const employeesRepo = {
      findUserIdByUsername: jest.fn().mockResolvedValue({ id: "u2" }),
      findEmployeeByUserId: jest.fn().mockResolvedValue({ id: "e1", userId: "u2" }),
      transaction: jest.fn().mockImplementation(async (fn) => fn({})),
      deleteEmployee: jest.fn(), softDeleteEmployee: jest.fn(),
      deleteUser: jest.fn(),
    };

    const storage = { archiveOwnerFiles: jest.fn() };
    const requestContext = { get: jest.fn().mockReturnValue({ requestId: '123' }) };

    const useCase = new DeleteEmployeeUseCase(employeesRepo as any, storage as any, requestContext as any);

    await useCase.execute("alice");

    expect(employeesRepo.findEmployeeByUserId).toHaveBeenCalledWith("u2");
    expect(employeesRepo.softDeleteEmployee).toHaveBeenCalled();
  });
});
