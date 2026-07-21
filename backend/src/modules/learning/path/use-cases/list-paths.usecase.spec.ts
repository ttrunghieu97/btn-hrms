import { ListPathsUseCase } from "./list-paths.usecase";

describe(ListPathsUseCase.name, () => {
  it("returns all learning paths", async () => {
    const repo = {
      findPaths: jest.fn().mockResolvedValue([
        { id: "path-1", name: "HR Track", status: "published" },
        { id: "path-2", name: "Payroll Track", status: "draft" },
      ]),
    };
    const useCase = new ListPathsUseCase(repo as any);
    const result = await useCase.execute();

    expect(result).toHaveLength(2);
    expect(result[0]!.name).toBe("HR Track");
  });

  it("returns empty list when no paths exist", async () => {
    const repo = { findPaths: jest.fn().mockResolvedValue([]) };
    const useCase = new ListPathsUseCase(repo as any);
    const result = await useCase.execute();
    expect(result).toEqual([]);
  });
});
