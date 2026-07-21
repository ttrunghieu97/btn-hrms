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
  );
  return { useCase, workflowRepo, eventOutbox, lifecycle };
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

  it("stages EmployeeTransferAppliedEvent", async () => {
    const { useCase, eventOutbox } = makeUseCase();
    await useCase.execute("wf-1", true);
    expect(eventOutbox.stage).toHaveBeenCalled();
    const event = eventOutbox.stage.mock.calls[0][0];
    expect(event.eventType).toBe("workforce.employee.transfer-applied.v1");
  });
});
