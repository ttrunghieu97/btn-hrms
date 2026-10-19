import { RejectTransferUseCase } from "./reject-transfer.usecase";

function makeUseCase(overrides?: Record<string, any>) {
  const employeesRepo = {
    transaction: jest.fn().mockImplementation(async (cb: any) => cb({})),
    ...overrides?.employeesRepo,
  };
  const workflowRepo = {
    getInstance: jest.fn().mockResolvedValue({
      id: "wf-1",
      subjectId: "e1",
      currentState: "manager_approval",
      status: "active",
    }),
    recordTransition: jest.fn().mockResolvedValue(undefined),
    updateInstance: jest.fn().mockResolvedValue(undefined),
    ...overrides?.workflowRepo,
  };
  const requestContext = {
    get: jest.fn().mockReturnValue({ userId: "actor-1" }),
    ...overrides?.requestContext,
  };
  const eventOutbox = {
    stage: jest.fn().mockResolvedValue(undefined),
    ...overrides?.eventOutbox,
  };
  const useCase = new RejectTransferUseCase(
    requestContext,
    employeesRepo,
    workflowRepo,
    eventOutbox,
  );
  return { useCase, workflowRepo, eventOutbox };
}

describe("RejectTransferUseCase", () => {
  it("rejects an active transfer request", async () => {
    const { useCase, workflowRepo } = makeUseCase();
    const result = await useCase.execute("e1", "wf-1");
    expect(result.success).toBe(true);
    expect(result.status).toBe("rejected");
    expect(workflowRepo.recordTransition).toHaveBeenCalledWith(
      expect.objectContaining({ toState: "rejected", transition: "reject" }),
    );
  });

  it("rejects when employeeId does not match", async () => {
    const { useCase } = makeUseCase();
    await expect(useCase.execute("e2", "wf-1")).rejects.toThrow();
  });

  it("rejects when instance not found", async () => {
    const workflowRepo = { getInstance: jest.fn().mockResolvedValue(null) };
    const { useCase } = makeUseCase({ workflowRepo });
    await expect(useCase.execute("e1", "wf-1")).rejects.toThrow();
  });

  it("blocks non-HR manager from rejecting a transfer at hr_approval stage (403)", async () => {
    const workflowRepo = {
      getInstance: jest.fn().mockResolvedValue({
        id: "wf-1",
        subjectId: "e1",
        currentState: "hr_approval",
        status: "active",
      }),
      recordTransition: jest.fn(),
      updateInstance: jest.fn(),
    };
    const requestContext = {
      get: jest.fn().mockReturnValue({
        userId: "mgr-1",
        permissions: ["employee:view:department", "employee:edit"],
      }),
    };
    const { useCase } = makeUseCase({ workflowRepo, requestContext });
    await expect(useCase.execute("e1", "wf-1", "No")).rejects.toThrow(
      "Only HR can reject a transfer at the HR approval stage",
    );
    expect(workflowRepo.recordTransition).not.toHaveBeenCalled();
  });

  it("allows HR manager to reject a transfer at hr_approval stage", async () => {
    const workflowRepo = {
      getInstance: jest.fn().mockResolvedValue({
        id: "wf-1",
        subjectId: "e1",
        currentState: "hr_approval",
        status: "active",
      }),
      recordTransition: jest.fn().mockResolvedValue(undefined),
      updateInstance: jest.fn().mockResolvedValue(undefined),
    };
    const requestContext = {
      get: jest.fn().mockReturnValue({
        userId: "hr-1",
        permissions: ["employee:manage"],
      }),
    };
    const { useCase } = makeUseCase({ workflowRepo, requestContext });
    const res = await useCase.execute("e1", "wf-1", "HR rejected");
    expect(res.status).toBe("rejected");
    expect(workflowRepo.recordTransition).toHaveBeenCalled();
  });

  it("blocks rejecting a transfer that is already in approved state awaiting effective date", async () => {
    const workflowRepo = {
      getInstance: jest.fn().mockResolvedValue({
        id: "wf-1",
        subjectId: "e1",
        currentState: "approved",
        status: "active",
      }),
      recordTransition: jest.fn(),
      updateInstance: jest.fn(),
    };
    const { useCase } = makeUseCase({ workflowRepo });
    await expect(useCase.execute("e1", "wf-1", "Too late")).rejects.toThrow(
      "Transfer request is not awaiting approval",
    );
  });
});
