import { ListDepartmentsFlatUseCase } from "./list-departments-flat.usecase";

describe(ListDepartmentsFlatUseCase.name, () => {
  it("returns flat department list", async () => {
    const repo = {
      findList: jest.fn().mockResolvedValue([
        { id: "dept-1", name: "Engineering", parentId: null },
        { id: "dept-2", name: "HR", parentId: null },
      ]),
    };
    const useCase = new ListDepartmentsFlatUseCase(repo as any, {} as any);
    const result = await useCase.execute({ page: 1, limit: 20 });

    expect(result).toHaveLength(2);
  });
});
