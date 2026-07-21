import { DepartmentMapper } from "./department.mapper";

describe("DepartmentMapper", () => {
  it("maps parentId in response dto", () => {
    const now = new Date();
    const result = DepartmentMapper.toResponseDto({
      id: "dept-1",
      name: "Engineering",
      description: null,
      parentId: "dept-root",
      createdAt: now,
      updatedAt: now,
    });

    expect(result).toMatchObject({
      id: "dept-1",
      name: "Engineering",
      parentId: "dept-root",
      employeeCount: 0,
    });
  });
});
