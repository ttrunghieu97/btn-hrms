import { RehireEmployeeUseCase } from "./rehire-employee.usecase";

function makeUseCase(overrides?: Record<string, any>) {
  const emp = { id: "e1", userId: "u1", status: "terminated" };
  const employeesRepo = {
    findCurrentOrgAssignment: jest.fn().mockResolvedValue(null),
    findByIdentifier: jest.fn().mockResolvedValue(emp),
    transaction: jest.fn().mockImplementation(async (cb: any) => cb({})),
    restoreEmployee: jest.fn().mockResolvedValue(undefined),
    updateEmployeeById: jest.fn().mockResolvedValue(undefined),
    ...overrides?.employeesRepo,
  };
  const lifecycle = {
    rehire: jest.fn().mockResolvedValue({ employmentRecordId: "er-1" }),
    assertOrgRefsAreValid: jest.fn().mockResolvedValue(undefined),
    assertValidManagerHierarchy: jest.fn().mockResolvedValue(undefined),
    ...overrides?.lifecycle,
  };
  const requestContext = {
    get: jest.fn().mockReturnValue({ userId: "actor-1" }),
    ...overrides?.requestContext,
  };
  const eventOutbox = {
    stage: jest.fn().mockResolvedValue(undefined),
    ...overrides?.eventOutbox,
  };
  const identityAdmin = {
    reactivateUser: jest.fn().mockResolvedValue(undefined),
    ...overrides?.identityAdmin,
  };
  const useCase = new RehireEmployeeUseCase(
    employeesRepo,
    lifecycle,
    requestContext,
    eventOutbox,
    identityAdmin,
  );
  return { useCase, employeesRepo, lifecycle, eventOutbox, identityAdmin };
}

describe("RehireEmployeeUseCase", () => {
  const validDto = {
    hireDate: "2026-07-01",
    contractType: "permanent",
    contractStatus: "active",
    departmentId: "dept-1",
    positionId: "pos-1",
    managerEmployeeId: "mgr-1",
    jobTitle: "Engineer",
    reason: "Rehire after job change",
  };

  it("rehires a terminated employee", async () => {
    const { useCase } = makeUseCase();
    const result = await useCase.execute("e1", validDto);
    expect(result.success).toBe(true);
    expect(result.employeeId).toBe("e1");
  });

  it("rejects rehire for non-terminated employee", async () => {
  const employeesRepo = {
    findCurrentOrgAssignment: jest.fn().mockResolvedValue(null),
      findByIdentifier: jest.fn().mockResolvedValue({ id: "e1", status: "working" }),
    };
    const { useCase } = makeUseCase({ employeesRepo });
    await expect(useCase.execute("e1", validDto)).rejects.toThrow();
  });

  it("reactivates identity on rehire", async () => {
    const { useCase, identityAdmin } = makeUseCase();
    await useCase.execute("e1", validDto);
    expect(identityAdmin.reactivateUser).toHaveBeenCalledWith("u1", expect.anything());
  });

  it("stages EmployeeRehiredEvent via outbox", async () => {
    const { useCase, eventOutbox } = makeUseCase();
    await useCase.execute("e1", validDto);
    expect(eventOutbox.stage).toHaveBeenCalled();
    const stagedEvent = eventOutbox.stage.mock.calls[0][0];
    expect(stagedEvent.eventType).toBe("workforce.employee.rehired.v1");
  });

  it("delegates to lifecycle.rehire to create employment records", async () => {
    const { useCase, lifecycle } = makeUseCase();
    await useCase.execute("e1", validDto);
    expect(lifecycle.rehire).toHaveBeenCalledWith(
      "e1",
      expect.objectContaining({
        hireDate: "2026-07-01",
        contractType: "permanent",
      }),
      "actor-1",
      expect.anything(),
    );
  });

  it("rejects when employee not found", async () => {
  const employeesRepo = {
    findCurrentOrgAssignment: jest.fn().mockResolvedValue(null),
      findByIdentifier: jest.fn().mockResolvedValue(null),
    };
    const { useCase } = makeUseCase({ employeesRepo });
    await expect(useCase.execute("e1", validDto)).rejects.toThrow();
  });
});
