import { GetDepartmentUseCase } from "./get-department.usecase";

describe(GetDepartmentUseCase.name, () => {
  it("returns department with employee count", async () => {
    const repo = {
      findById: jest.fn().mockResolvedValue({ id: "dept-1", name: "Engineering", parentId: null }),
    };
    const employeeReader = {
      countActiveEmployeesByDepartments: jest.fn().mockResolvedValue({ "dept-1": 12 }),
    };
    const requestContext = { get: jest.fn().mockReturnValue({ requestId: "rid" }) };
    const useCase = new GetDepartmentUseCase(repo as any, requestContext as any, employeeReader as any);
    const result = await useCase.execute("dept-1");

    expect(result).toBeDefined();
    expect(employeeReader.countActiveEmployeesByDepartments).toHaveBeenCalled();
  });

  it("throws when department not found", async () => {
    const repo = { findById: jest.fn().mockResolvedValue(null) };
    const useCase = new GetDepartmentUseCase(repo as any, {} as any, {} as any);
    await expect(useCase.execute("missing")).rejects.toThrow("Department with ID missing not found");
  });
});
