import { GetEmployeeByUserUseCase } from "./get-employee-by-user.usecase";

describe(GetEmployeeByUserUseCase.name, () => {
  it("looks up employee by userId and delegates to GetEmployeeUseCase", async () => {
    const employeesRepo = {
      findEmployeeByUserId: jest.fn().mockResolvedValue({ id: "e1" }),
    };
    const getEmployee = { execute: jest.fn().mockResolvedValue({ id: "e1" }) };

    const useCase = new GetEmployeeByUserUseCase(
      employeesRepo as any,
      getEmployee as any,
      {} as any,
    );

    await useCase.execute("u1");

    expect(employeesRepo.findEmployeeByUserId).toHaveBeenCalledWith("u1");
    expect(getEmployee.execute).toHaveBeenCalledWith("e1");
  });
});
