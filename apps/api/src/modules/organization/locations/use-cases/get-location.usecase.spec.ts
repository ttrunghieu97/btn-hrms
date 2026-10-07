import { GetLocationUseCase } from "./get-location.usecase";

describe(GetLocationUseCase.name, () => {
  it("returns location when found", async () => {
    const repo = {
      findById: jest.fn().mockResolvedValue({ id: "loc-1", name: "HCMC Office" }),
    };
    const useCase = new GetLocationUseCase(repo as any, {} as any);
    const result = await useCase.execute("loc-1");

    expect(result).toBeDefined();
    expect(result).toHaveProperty("name");
  });
});
