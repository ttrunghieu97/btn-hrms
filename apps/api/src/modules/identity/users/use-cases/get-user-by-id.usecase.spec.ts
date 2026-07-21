import { GetUserByIdUseCase } from "./get-user-by-id.usecase";

describe(GetUserByIdUseCase.name, () => {
  it("calls repository with id and optional query", async () => {
    const usersRepo = {
      findById: jest.fn().mockResolvedValue({ id: "u1" }),
    };

    const employeeReader = {
      findEmployeeByUserId: jest.fn().mockResolvedValue(null),
    };

    const useCase = new GetUserByIdUseCase(usersRepo as any, {} as any, employeeReader as any);
    await useCase.execute("u1");

    expect(usersRepo.findById).toHaveBeenCalledWith("u1", undefined);
  });

  it("throws not found when user does not exist", async () => {
    const usersRepo = {
      findById: jest.fn().mockResolvedValue(null),
    };

    const employeeReader = {
      findEmployeeByUserId: jest.fn().mockResolvedValue(null),
    };

    const useCase = new GetUserByIdUseCase(usersRepo as any, {} as any, employeeReader as any);
    await expect(useCase.execute("missing")).rejects.toThrow();
  });
});
