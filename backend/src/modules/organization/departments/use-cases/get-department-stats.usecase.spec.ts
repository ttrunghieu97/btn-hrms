import { GetDepartmentStatsUseCase } from "./get-department-stats.usecase";

describe(GetDepartmentStatsUseCase.name, () => {
  it("returns employee counts per department", async () => {
    const employeeReader = {
      countActiveEmployeesByDepartments: jest.fn().mockResolvedValue({
        "dept-1": 10, "dept-2": 5,
      }),
    };
    const useCase = new GetDepartmentStatsUseCase({} as any, employeeReader as any);
    const result = await useCase.execute();

    expect(result["dept-1"]).toBe(10);
    expect(result["dept-2"]).toBe(5);
  });
});
