import { SecurityRepository } from "./security.repository";

describe("SecurityRepository — loadAuthSession", () => {
  it("includes authorizationVersion in loaded session user", async () => {
    const mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([
        {
          id: "u-123",
          username: "john.doe",
          isSuperAdmin: false,
          isActive: true,
          authorizationVersion: 5,
          employeeId: "emp-456",
          departmentId: "dept-789",
        },
      ]),
    } as any;

    const repo = new SecurityRepository(mockDb);
    const session = await repo.loadAuthSession("u-123");

    expect(session).toBeDefined();
    expect(session?.user).toEqual({
      id: "u-123",
      username: "john.doe",
      isSuperAdmin: false,
      isActive: true,
      authorizationVersion: 5,
    });
    expect(session?.employee).toEqual({
      id: "emp-456",
      departmentId: "dept-789",
    });
  });

  it("returns null when user not found", async () => {
    const mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    } as any;

    const repo = new SecurityRepository(mockDb);
    const session = await repo.loadAuthSession("non-existent");

    expect(session).toBeNull();
  });
});
