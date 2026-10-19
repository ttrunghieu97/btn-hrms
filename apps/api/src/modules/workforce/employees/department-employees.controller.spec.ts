import { DepartmentEmployeesController } from "./department-employees.controller";
import { EmployeeQueryDto } from "./dto/employee-query.dto";

describe("DepartmentEmployeesController", () => {
  it("blocks self-scoped user when departmentId is missing or mismatched", () => {
    const listEmployees = { execute: jest.fn() };
    const queryScopeService = {
      resolveScope: jest.fn().mockReturnValue({ tier: "self", employeeId: "emp-1" }),
    };
    const controller = new DepartmentEmployeesController(
      listEmployees as any,
      queryScopeService as any,
    );

    expect(() =>
      controller.listByDepartment("dept-1", new EmployeeQueryDto(), {
        user: { id: "u-1", permissions: ["employee:view:self"] } as any,
      }),
    ).toThrow("Access denied to out-of-scope department employees");
    expect(listEmployees.execute).not.toHaveBeenCalled();
  });

  it("passes sensitiveAllowed as 3rd argument to listEmployees.execute", () => {
    const listEmployees = { execute: jest.fn().mockResolvedValue({ data: [] }) };
    const queryScopeService = {
      resolveScope: jest.fn().mockReturnValue({ tier: "department", departmentId: "dept-1" }),
    };
    const controller = new DepartmentEmployeesController(
      listEmployees as any,
      queryScopeService as any,
    );

    const query = new EmployeeQueryDto();
    const userWithSensitive = {
      id: "u-1",
      departmentId: "dept-1",
      permissions: ["employee:view:department", "employee:view:sensitive"],
    } as any;

    controller.listByDepartment("dept-1", query, { user: userWithSensitive });
    expect(listEmployees.execute).toHaveBeenCalledWith(
      expect.objectContaining({ departmentId: "dept-1" }),
      { tier: "department", departmentId: "dept-1" },
      true,
    );
  });
});
