import { DeletePositionUseCase } from "./delete-position.usecase";

describe(DeletePositionUseCase.name, () => {
  it("soft-deletes an active position", async () => {
    const repo = {
      getActive: jest.fn().mockResolvedValue({ id: "pos-1", name: "Junior Engineer" }),
      softDeletePosition: jest.fn().mockResolvedValue({}),
    };
    const useCase = new DeletePositionUseCase(repo as any, {} as any);
    await useCase.execute("pos-1");
    expect(repo.softDeletePosition).toHaveBeenCalledWith("pos-1");
  });

  it("rejects delete of non-existent position", async () => {
    const repo = { getActive: jest.fn().mockResolvedValue(null) };
    const useCase = new DeletePositionUseCase(repo as any, {} as any);
    await expect(useCase.execute("missing")).rejects.toThrow("Position not found");
  });
});
