import { RequestTransferUseCase } from "./request-transfer.usecase";

function makeUseCase(overrides?: Record<string, any>) {
  const employeesRepo = {
    findByIdentifier: jest.fn().mockResolvedValue({ id: "e1", status: "working", deletedAt: null }),
    transaction: jest.fn().mockImplementation(async (cb: any) => cb({})),
    findCurrentOrgAssignment: jest.fn().mockResolvedValue(null),
    ...overrides?.employeesRepo,
  };
  const lifecycle = {
    assertCanRequestTransfer: jest.fn().mockReturnValue(undefined),
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
  const workflowEngine = {
    startWorkflow: jest.fn().mockResolvedValue({ id: "wf-1" }),
    transition: jest.fn().mockResolvedValue(undefined),
    ...overrides?.workflowEngine,
  };
  const useCase = new RequestTransferUseCase(
    employeesRepo,
    lifecycle,
    requestContext,
    eventOutbox,
    workflowEngine,
  );
  return { useCase, employeesRepo, lifecycle, eventOutbox, workflowEngine };
}

describe("RequestTransferUseCase", () => {
  const dto = {
    effectiveDate: "2026-07-15",
    toDepartmentId: "dept-2",
    toPositionId: "pos-2",
    toManagerEmployeeId: "mgr-2",
    reason: "Department restructuring",
  };

  it("creates transfer request for active employee", async () => {
    const { useCase } = makeUseCase();
    const result = await useCase.execute("e1", dto);
    expect(result.success).toBe(true);
    expect(result.workflowInstanceId).toBe("wf-1");
  });

  it("starts transfer workflow", async () => {
    const { useCase, workflowEngine } = makeUseCase();
    await useCase.execute("e1", dto);
    expect(workflowEngine.startWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ key: "transfer", subjectId: "e1" }),
    );
  });

  it("transitions workflow to manager_approval on submit", async () => {
    const { useCase, workflowEngine } = makeUseCase();
    await useCase.execute("e1", dto);
    expect(workflowEngine.transition).toHaveBeenCalledWith("wf-1", "submit", "actor-1");
  });

  it("stages EmployeeTransferRequestedEvent via outbox", async () => {
    const { useCase, eventOutbox } = makeUseCase();
    await useCase.execute("e1", dto);
    expect(eventOutbox.stage).toHaveBeenCalled();
    const event = eventOutbox.stage.mock.calls[0][0];
    expect(event.eventType).toBe("workforce.employee.transfer-requested.v1");
  });

  it("rejects transfer for terminated employee", async () => {
    const employeesRepo = {
      findByIdentifier: jest.fn().mockResolvedValue({ id: "e1", status: "terminated", deletedAt: null }),
    };
    const { useCase } = makeUseCase({ employeesRepo });
    await expect(useCase.execute("e1", dto)).rejects.toThrow();
  });

  it("rejects transfer for archived employee", async () => {
    const employeesRepo = {
      findByIdentifier: jest.fn().mockResolvedValue({ id: "e1", status: "working", deletedAt: new Date() }),
    };
    const { useCase } = makeUseCase({ employeesRepo });
    await expect(useCase.execute("e1", dto)).rejects.toThrow();
  });

  it("rejects when employee not found", async () => {
    const employeesRepo = {
      findByIdentifier: jest.fn().mockResolvedValue(null),
    };
    const { useCase } = makeUseCase({ employeesRepo });
    await expect(useCase.execute("e1", dto)).rejects.toThrow();
  });
});
