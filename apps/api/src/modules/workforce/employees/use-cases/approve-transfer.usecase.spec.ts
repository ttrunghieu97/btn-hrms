import { ApproveTransferUseCase } from "./approve-transfer.usecase";

function makeUseCase(currentState = "manager_approval", overrides?: Record<string, any>) {
  const workflowRepo = {
    getInstance: jest.fn().mockResolvedValue({
      id: "wf-1",
      subjectId: "e1",
      currentState,
      status: "active",
      metadata: { effectiveDate: "2026-07-15" },
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
  const applyTransfer = {
    execute: jest.fn().mockResolvedValue({ success: true }),
    ...overrides?.applyTransfer,
  };
  const useCase = new ApproveTransferUseCase(
    requestContext,
    eventOutbox,
    workflowRepo,
    applyTransfer,
  );
  return { useCase, workflowRepo, eventOutbox, applyTransfer };
}

describe("ApproveTransferUseCase", () => {
  it("manager approves → moves to hr_approval", async () => {
    const { useCase, workflowRepo } = makeUseCase("manager_approval");
    const result = await useCase.execute("e1", "wf-1", "manager");
    expect(result.newState).toBe("hr_approval");
    expect(workflowRepo.recordTransition).toHaveBeenCalledWith(
      expect.objectContaining({ transition: "manager_approve", toState: "hr_approval" }),
    );
  });

  it("HR approves → moves to approved, stages EmployeeTransferApprovedEvent, and calls apply", async () => {
    const { useCase, workflowRepo, eventOutbox, applyTransfer } = makeUseCase("hr_approval");
    await useCase.execute("e1", "wf-1", "hr");
    expect(workflowRepo.recordTransition).toHaveBeenCalledWith(
      expect.objectContaining({ transition: "hr_approve", toState: "approved" }),
    );
    expect(workflowRepo.updateInstance).toHaveBeenCalledWith("wf-1", {
      currentState: "approved",
    });
    expect(eventOutbox.stage).toHaveBeenCalledTimes(1);
    expect(eventOutbox.stage.mock.calls[0][0].eventType).toBe(
      "workforce.employee.transfer-approved.v1",
    );
    expect(applyTransfer.execute).toHaveBeenCalled();
  });

  it("rejects manager approve when in wrong state", async () => {
    const { useCase } = makeUseCase("hr_approval");
    await expect(useCase.execute("e1", "wf-1", "manager")).rejects.toThrow();
  });

  it("rejects HR approve when in wrong state", async () => {
    const { useCase } = makeUseCase("manager_approval");
    await expect(useCase.execute("e1", "wf-1", "hr")).rejects.toThrow();
  });

  it("rejects when employeeId does not match", async () => {
    const { useCase } = makeUseCase("manager_approval");
    await expect(useCase.execute("e2", "wf-1", "manager")).rejects.toThrow();
  });

  it("rejects when instance not found", async () => {
    const workflowRepo = {
      getInstance: jest.fn().mockResolvedValue(null),
    };
    const { useCase } = makeUseCase("manager_approval", { workflowRepo });
    await expect(useCase.execute("e1", "wf-1", "manager")).rejects.toThrow();
  });

  it("HR approves future-dated transfer → moves to approved and keeps workflow active without immediate apply", async () => {
    const workflowRepo = {
      getInstance: jest.fn().mockResolvedValue({
        id: "wf-1",
        subjectId: "e1",
        currentState: "hr_approval",
        status: "active",
        metadata: { effectiveDate: "2099-12-31" },
      }),
      recordTransition: jest.fn().mockResolvedValue(undefined),
      updateInstance: jest.fn().mockResolvedValue(undefined),
    };
    const { useCase, applyTransfer } = makeUseCase("hr_approval", { workflowRepo });
    const result = await useCase.execute("e1", "wf-1", "hr");
    expect(result.newState).toBe("approved");
    expect(workflowRepo.updateInstance).toHaveBeenCalledWith(
      "wf-1",
      expect.objectContaining({
        currentState: "approved",
      }),
    );
    expect(applyTransfer.execute).not.toHaveBeenCalled();
  });
});
