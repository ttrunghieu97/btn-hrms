import { UpdatePositionUseCase } from "./update-position.usecase";

describe(UpdatePositionUseCase.name, () => {
  it("updates position name", async () => {
    const repo = {
      getActive: jest.fn().mockResolvedValue({ id: "pos-1", name: "Junior Engineer" }),
      findActiveByTitle: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
    };
    const db = {
      getDb: jest.fn().mockReturnValue({ transaction: jest.fn().mockImplementation(async (fn) => fn({})) }),
    };
    const useCase = new UpdatePositionUseCase(repo as any, { stage: jest.fn() } as any, {} as any, db as any);
    await useCase.execute("pos-1", { name: "Senior Engineer" });

    expect(repo.update).toHaveBeenCalled();
  });

  it("rejects update of non-existent position", async () => {
    const repo = { getActive: jest.fn().mockResolvedValue(null) };
    const useCase = new UpdatePositionUseCase(repo as any, {} as any, {} as any, {} as any);
    await expect(
      useCase.execute("missing", { name: "Engineer" }),
    ).rejects.toThrow("Position not found");
  });
});
