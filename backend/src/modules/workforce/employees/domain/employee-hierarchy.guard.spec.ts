import { EmployeeHierarchyGuard } from "./employee-hierarchy.guard";

describe("EmployeeHierarchyGuard", () => {
  let repo: any;
  const guard = EmployeeHierarchyGuard.validateNoCycles;

  beforeEach(() => {
    repo = {
      findCurrentOrgAssignment: jest.fn(),
    };
  });

  it("rejects self-manager (A → A)", async () => {
    await expect(
      guard({ employeeId: "a", managerId: "a", employeesRepo: repo }),
    ).rejects.toThrow("MANAGER_HIERARCHY_CYCLE_DETECTED");
  });

  it("rejects direct cycle (A → B → A)", async () => {
    repo.findCurrentOrgAssignment.mockImplementation((id: string) => {
      if (id === "b") return Promise.resolve({ managerEmployeeId: "a" });
      return Promise.resolve(null);
    });
    await expect(
      guard({ employeeId: "a", managerId: "b", employeesRepo: repo }),
    ).rejects.toThrow("MANAGER_HIERARCHY_CYCLE_DETECTED");
  });

  it("rejects indirect cycle (A → B → C → D → B)", async () => {
    const chain: Record<string, any> = {
      b: { managerEmployeeId: "c" },
      c: { managerEmployeeId: "d" },
      d: { managerEmployeeId: "b" },
    };
    repo.findCurrentOrgAssignment.mockImplementation((id: string) =>
      Promise.resolve(chain[id] ?? null),
    );
    await expect(
      guard({ employeeId: "a", managerId: "b", employeesRepo: repo }),
    ).rejects.toThrow("MANAGER_HIERARCHY_CYCLE_DETECTED");
  });

  it("accepts valid chain (A → B → C → null)", async () => {
    const chain: Record<string, any> = {
      b: { managerEmployeeId: "c" },
      c: { managerEmployeeId: null },
    };
    repo.findCurrentOrgAssignment.mockImplementation((id: string) =>
      Promise.resolve(chain[id] ?? null),
    );
    await expect(
      guard({ employeeId: "a", managerId: "b", employeesRepo: repo }),
    ).resolves.toBeUndefined();
  });

  it("passes when managerId is null", async () => {
    await expect(
      guard({ employeeId: "a", managerId: null, employeesRepo: repo }),
    ).resolves.toBeUndefined();
  });

  it("passes when managerId is undefined", async () => {
    await expect(
      guard({ employeeId: "a", managerId: undefined, employeesRepo: repo }),
    ).resolves.toBeUndefined();
  });

  it("rejects at depth limit (100-node chain)", async () => {
    repo.findCurrentOrgAssignment.mockResolvedValue({ managerEmployeeId: "next" });
    await expect(
      guard({ employeeId: "root", managerId: "node-1", employeesRepo: repo }),
    ).rejects.toThrow("MANAGER_HIERARCHY_CYCLE_DETECTED");
  });

  it("accepts large acyclic graph (A → B → C → ... → Z)", async () => {
    // Create a chain A → B → C → ... → Z. Last node returns null manager.
    let callCount = 0;
    repo.findCurrentOrgAssignment.mockImplementation(() => {
      callCount++;
      if (callCount >= 30) return Promise.resolve({ managerEmployeeId: null });
      return Promise.resolve({ managerEmployeeId: `node-${callCount + 1}` });
    });
    await expect(
      guard({ employeeId: "start", managerId: "node-1", employeesRepo: repo }),
    ).resolves.toBeUndefined();
  });
});
