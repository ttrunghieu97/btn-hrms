import { EmployeeQueryDto } from "../dto/employee-query.dto";
import { ListEmployeesUseCase } from "./list-employees.usecase";

function employeeRow() {
  return {
    id: "e1",
    userId: "u1",
    firstName: "A",
    lastName: "B",
    employeeCode: "E1",
    status: "working",
    user: { id: "u1", username: "ab", email: null },
    orgAssignments: [
      {
        id: "oa1",
        jobTitle: "Accountant",
        department: null,
        isCurrent: true,
      },
    ],
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  };
}

describe(ListEmployeesUseCase.name, () => {
  it("resolves positions for job titles without requiring a department", async () => {
    const employeesRepo = {
      findPaginated: jest.fn().mockResolvedValue({
        rows: [employeeRow()],
        total: 1,
        page: 1,
        limit: 20,
      }),
    };
    const positionRepo = {
      getActivePositions: jest.fn().mockResolvedValue([
        {
          id: "pos-1",
          name: "Accountant",
          description: null,
          isActive: true,
        },
      ]),
    };
    const useCase = new ListEmployeesUseCase(
      employeesRepo as any,
      positionRepo as any,
    );

    const result = await useCase.execute(new EmployeeQueryDto());

    expect(positionRepo.getActivePositions).toHaveBeenCalledTimes(1);
    expect(result.data[0]?.position).toEqual({
      id: "pos-1",
      name: "Accountant",
      description: null,
      isActive: true,
    });
  });

  it("propagates position catalog failures", async () => {
    const employeesRepo = {
      findPaginated: jest.fn().mockResolvedValue({
        rows: [employeeRow()],
        total: 1,
        page: 1,
        limit: 20,
      }),
    };
    const positionRepo = {
      getActivePositions: jest.fn().mockRejectedValue(new Error("position database unavailable")),
    };
    const useCase = new ListEmployeesUseCase(
      employeesRepo as any,
      positionRepo as any,
    );

    await expect(useCase.execute(new EmployeeQueryDto())).rejects.toThrow(
      "position database unavailable",
    );
  });
});
