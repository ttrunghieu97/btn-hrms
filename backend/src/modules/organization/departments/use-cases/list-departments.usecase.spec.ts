import { ListDepartmentsUseCase } from "./list-departments.usecase";

describe(ListDepartmentsUseCase.name, () => {
  it("returns paginated departments with employee counts", async () => {
    const repo = {
      findPaginated: jest.fn().mockResolvedValue({
        rows: [{ id: "dept-1", name: "Engineering", parentId: null }],
        total: 1, page: 1, limit: 20,
      }),
    };
    const employeeReader = {
      countActiveEmployeesByDepartments: jest.fn().mockResolvedValue({ "dept-1": 12 }),
    };
    const useCase = new ListDepartmentsUseCase(repo as any, {} as any, employeeReader as any);
    const result = await useCase.execute({ page: 1, limit: 20 });

    expect(result.data).toHaveLength(1);
    expect(result.meta).toBeDefined();
  });
});
