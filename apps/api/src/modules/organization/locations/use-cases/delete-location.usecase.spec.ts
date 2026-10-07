import { DeleteLocationUseCase } from "./delete-location.usecase";

describe(DeleteLocationUseCase.name, () => {
  it("deletes an existing location", async () => {
    const repo = {
      findById: jest.fn().mockResolvedValue({ id: "loc-1", name: "HCMC Office" }),
      delete: jest.fn().mockResolvedValue({}),
    };
    const useCase = new DeleteLocationUseCase(repo as any, {} as any);
    await useCase.execute("loc-1");
    expect(repo.delete).toHaveBeenCalledWith("loc-1");
  });

  it("rejects delete of non-existent location", async () => {
    const repo = { findById: jest.fn().mockResolvedValue(null) };
    const useCase = new DeleteLocationUseCase(repo as any, {} as any);
    await expect(useCase.execute("missing")).rejects.toThrow("Location not found");
  });
});
