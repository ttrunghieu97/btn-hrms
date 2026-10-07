import { UpdateLocationUseCase } from "./update-location.usecase";

describe(UpdateLocationUseCase.name, () => {
  it("updates location name", async () => {
    const repo = {
      findById: jest.fn().mockResolvedValue({ id: "loc-1", name: "Old Name" }),
      update: jest.fn().mockResolvedValue({ id: "loc-1", name: "New Name" }),
    };
    const useCase = new UpdateLocationUseCase(repo as any, {} as any);
    await useCase.execute("loc-1", { name: "New Name" });

    expect(repo.update).toHaveBeenCalledWith("loc-1", { name: "New Name" });
  });

  it("rejects update of non-existent location", async () => {
    const repo = { findById: jest.fn().mockResolvedValue(null) };
    const useCase = new UpdateLocationUseCase(repo as any, {} as any);
    await expect(
      useCase.execute("missing", { name: "New Name" }),
    ).rejects.toThrow("Location not found");
  });
});
