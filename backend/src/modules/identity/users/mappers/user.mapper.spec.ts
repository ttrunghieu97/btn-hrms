import { UserMapper } from "./user.mapper";

describe("UserMapper", () => {
  it("preserves nullable email and derives the employee display name", () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const updatedAt = new Date("2026-01-02T00:00:00.000Z");

    expect(
      UserMapper.toResponseDto({
        id: "user-1",
        username: "employee.one",
        email: null,
        isSuperAdmin: false,
        lastLoginAt: null,
        createdAt,
        updatedAt,
        employee: {
          id: "employee-1",
          firstName: "An",
          lastName: "Nguyen",
          avatar: null,
        },
      }),
    ).toEqual({
      id: "user-1",
      username: "employee.one",
      email: null,
      isSuperAdmin: false,
      lastLoginAt: null,
      createdAt,
      updatedAt,
      employeeUsername: "An Nguyen",
      permissions: undefined,
      roleIds: undefined,
      avatar: null,
    });
  });
});
