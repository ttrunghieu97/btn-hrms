import { CreateLocationUseCase } from "./create-location.usecase";

describe(CreateLocationUseCase.name, () => {
  it("creates a location", async () => {
    const repo = {
      create: jest.fn().mockResolvedValue({ id: "loc-1", name: "HCMC Office", address: "123 Street" }),
    };
    const useCase = new CreateLocationUseCase(repo as any, {} as any);
    const result = await useCase.execute({ name: "HCMC Office", address: "123 Street", type: "office" } as any);

    expect(repo.create).toHaveBeenCalledWith({ name: "HCMC Office", address: "123 Street", type: "office" } as any);
    expect(result).toBeDefined();
  });
});
