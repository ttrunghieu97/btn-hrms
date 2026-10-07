import { GetUserByUsernameUseCase } from "./get-user-by-username.usecase";

describe(GetUserByUsernameUseCase.name, () => {
  it("calls repository with username and optional query", async () => {
    const usersRepo = {
      findByUsername: jest.fn().mockResolvedValue({ id: "u1" }),
    };

    const employeeReader = {
      findEmployeeByUserId: jest.fn().mockResolvedValue(null),
    };

    const useCase = new GetUserByUsernameUseCase(usersRepo as any, {} as any, employeeReader as any);
    await useCase.execute("alice");

    expect(usersRepo.findByUsername).toHaveBeenCalledWith("alice", undefined);
  });
});
