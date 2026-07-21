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
});
