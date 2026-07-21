import { GetUserByEmailUseCase } from "./get-user-by-email.usecase";

describe(GetUserByEmailUseCase.name, () => {
  it("calls repository with email", async () => {
    const usersRepo = {
      findByEmail: jest.fn().mockResolvedValue({ id: "u1" }),
    };

    const useCase = new GetUserByEmailUseCase(usersRepo as any, {} as any);
    await useCase.execute("a@example.com");

    expect(usersRepo.findByEmail).toHaveBeenCalledWith("a@example.com");
  });
});
