import { ApplyTransferUseCase } from "./apply-transfer.usecase";

function makeUseCase(overrides?: Record<string, any>) {
  const workflowRepo = {
    getInstance: jest.fn().mockResolvedValue({
      id: "wf-1",
      subjectId: "e1",
      currentState: "approved",
      status: "completed",
      metadata: {
        effectiveDate: "2026-07-15",
        toDepartmentId: "dept-2",
        toManagerEmployeeId: "mgr-2",
        toJobTitle: "Engineer",
        reason: "Restructuring",
      },
    }),
    updateInstance: jest.fn().mockResolvedValue(undefined),
    ...overrides?.workflowRepo,
  };
  const employeesRepo = {
    findByIdentifier: jest.fn().mockResolvedValue({ id: "e1", status: "working", deletedAt: null }),
    findCurrentOrgAssignment: jest.fn().mockResolvedValue(null),
    transaction: jest.fn().mockImplementation(async (cb: any) => {
      const tx = {
        query: {
          orgAssignments: {
            findFirst: jest.fn().mockResolvedValue(null),
          },
        },
        insert: jest.fn().mockReturnValue({ values: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([{ id: "new-oa-1" }]) }) }),
        update: jest.fn().mockReturnValue({ set: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) }) }),
      };
      await cb(tx);
    }),
    ...overrides?.employeesRepo,
  };
  const requestContext = {
    get: jest.fn().mockReturnValue({ userId: "actor-1" }),
    ...overrides?.requestContext,
  };
  const eventOutbox = {
    stage: jest.fn().mockResolvedValue(undefined),
    ...overrides?.eventOutbox,
  };
  const lifecycle = {
    assertOrgRefsAreValid: jest.fn().mockResolvedValue(undefined),
    assertValidManagerHierarchy: jest.fn().mockResolvedValue(undefined),
    ...overrides?.lifecycle,
  };
  const useCase = new ApplyTransferUseCase(
    employeesRepo,
    requestContext,
    eventOutbox,
    workflowRepo,
    lifecycle,
    overrides?.positionsReader,
  );
  return { useCase, workflowRepo, employeesRepo, eventOutbox, lifecycle };
}

describe("ApplyTransferUseCase", () => {
  it("applies an approved transfer (effective date <= today)", async () => {
    const { useCase } = makeUseCase();
    const result = await useCase.execute("wf-1", true);
    expect(result.success).toBe(true);
  });

  it("rejects when instance not found", async () => {
    const workflowRepo = { getInstance: jest.fn().mockResolvedValue(null) };
    const { useCase } = makeUseCase({ workflowRepo });
    await expect(useCase.execute("wf-1")).rejects.toThrow();
  });

  it("rejects when employee not found", async () => {
    const employeesRepo = {
      findByIdentifier: jest.fn().mockResolvedValue(null),
      findEmployeeById: jest.fn().mockResolvedValue(null),
    };
    const { useCase } = makeUseCase({ employeesRepo });
    await expect(useCase.execute("wf-1", true)).rejects.toThrow("Employee not found");
  });

  it("rejects when employee is terminated or archived", async () => {
    const employeesRepo = {
      findByIdentifier: jest.fn().mockResolvedValue({ id: "e1", status: "terminated", deletedAt: null }),
    };
    const { useCase } = makeUseCase({ employeesRepo });
    await expect(useCase.execute("wf-1", true)).rejects.toThrow();
  });

  it("resolves toJobTitle from toPositionId when toJobTitle is omitted", async () => {
    let insertedValues: any;
    const workflowRepo = {
      getInstance: jest.fn().mockResolvedValue({
        id: "wf-1",
        subjectId: "e1",
        currentState: "approved",
        status: "active",
        metadata: {
          effectiveDate: "2026-07-15",
          toDepartmentId: "dept-2",
          toPositionId: "pos-99",
          toManagerEmployeeId: "mgr-2",
        },
      }),
      updateInstance: jest.fn().mockResolvedValue(undefined),
    };
    const employeesRepo = {
      findByIdentifier: jest.fn().mockResolvedValue({ id: "e1", status: "working", deletedAt: null }),
      findCurrentOrgAssignment: jest.fn().mockResolvedValue(null),
      transaction: jest.fn().mockImplementation(async (cb: any) => {
        const tx = {
          query: { orgAssignments: { findFirst: jest.fn().mockResolvedValue(null) } },
          insert: jest.fn().mockReturnValue({
            values: jest.fn().mockImplementation((vals: any) => {
              if (vals.assignmentType === "primary") insertedValues = vals;
              return { returning: jest.fn().mockResolvedValue([{ id: "new-oa-1" }]) };
            }),
          }),
          update: jest.fn().mockReturnValue({ set: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) }) }),
        };
        await cb(tx);
      }),
    };
    const positionsReader = {
      findById: jest.fn().mockResolvedValue({ id: "pos-99", name: "Staff Architect" }),
    };
    const { useCase } = makeUseCase({ workflowRepo, employeesRepo, positionsReader });
    await useCase.execute("wf-1", true);
    expect(insertedValues).toMatchObject({
      departmentId: "dept-2",
      jobTitle: "Staff Architect",
    });
  });

  it("stages EmployeeTransferAppliedEvent", async () => {
    const { useCase, eventOutbox } = makeUseCase();
    await useCase.execute("wf-1", true);
    expect(eventOutbox.stage).toHaveBeenCalled();
    const event = eventOutbox.stage.mock.calls[0][0];
    expect(event.eventType).toBe("workforce.employee.transfer-applied.v1");
  });

  it("rejects when workflow instance is not in approved state", async () => {
    const workflowRepo = {
      getInstance: jest.fn().mockResolvedValue({
        id: "wf-1",
        subjectId: "e1",
        currentState: "manager_approval",
        status: "active",
        metadata: { effectiveDate: "2026-07-15", toDepartmentId: "dept-2", reason: "Test" },
      }),
    };
    const { useCase } = makeUseCase({ workflowRepo });
    await expect(useCase.execute("wf-1", false)).rejects.toThrow();
  });

  it("rejects duplicate manual apply when instance status is already completed", async () => {
    const { useCase } = makeUseCase();
    await expect(useCase.execute("wf-1", false)).rejects.toThrow();
  });

  it("rejects when expectedEmployeeId does not match workflow subjectId", async () => {
    const workflowRepo = {
      getInstance: jest.fn().mockResolvedValue({
        id: "wf-1",
        subjectId: "e1",
        currentState: "approved",
        status: "active",
        metadata: { effectiveDate: "2026-07-15", toDepartmentId: "dept-2", reason: "Test" },
      }),
    };
    const { useCase } = makeUseCase({ workflowRepo });
    await expect(useCase.execute("wf-1", false, "wrong-employee-id")).rejects.toThrow();
  });
});
