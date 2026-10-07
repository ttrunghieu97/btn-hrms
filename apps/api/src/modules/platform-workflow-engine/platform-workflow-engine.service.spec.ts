import { PlatformWorkflowEngineService } from "./platform-workflow-engine.service";

describe("PlatformWorkflowEngineService - transition", () => {
  let service: PlatformWorkflowEngineService;
  let repoMock: any;

  beforeEach(() => {
    repoMock = {
      getInstance: jest.fn(),
      getDefinitionById: jest.fn(),
      updateInstance: jest.fn(),
      recordTransition: jest.fn(),
    };
    service = new PlatformWorkflowEngineService(repoMock);
  });

  it("throws when instance is not found", async () => {
    repoMock.getInstance.mockResolvedValue(null);
    await expect(service.transition("i-1", "approve", "u-1")).rejects.toThrow(
      "workflow_instance_not_found:i-1",
    );
  });

  it("throws when instance is not active", async () => {
    repoMock.getInstance.mockResolvedValue({ id: "i-1", status: "completed" });
    await expect(service.transition("i-1", "approve", "u-1")).rejects.toThrow(
      "workflow_instance_not_active:i-1",
    );
  });

  it("throws when transition does not exist in definition", async () => {
    repoMock.getInstance.mockResolvedValue({
      id: "i-1",
      status: "active",
      definitionId: "d-1",
      currentState: "draft",
    });
    repoMock.getDefinitionById.mockResolvedValue({
      id: "d-1",
      transitions: {
        submit: { from: "draft", to: "pending" },
      },
    });

    await expect(service.transition("i-1", "invalid_tx", "u-1")).rejects.toThrow(
      "invalid_workflow_transition:invalid_tx",
    );
  });

  it("throws when current state is not in allowed from states", async () => {
    repoMock.getInstance.mockResolvedValue({
      id: "i-1",
      status: "active",
      definitionId: "d-1",
      currentState: "draft",
    });
    repoMock.getDefinitionById.mockResolvedValue({
      id: "d-1",
      transitions: {
        approve: { from: "pending", to: "approved" },
      },
    });

    await expect(service.transition("i-1", "approve", "u-1")).rejects.toThrow(
      "cannot_transition_from_draft_via_approve",
    );
  });

  it("updates currentState and completes instance when next state is terminal", async () => {
    repoMock.getInstance.mockResolvedValue({
      id: "i-1",
      status: "active",
      definitionId: "d-1",
      currentState: "pending",
    });
    repoMock.getDefinitionById.mockResolvedValue({
      id: "d-1",
      states: {
        approved: { terminal: true },
      },
      transitions: {
        approve: { from: "pending", to: "approved" },
      },
    });

    await service.transition("i-1", "approve", "u-1", { note: "LGTM" });

    expect(repoMock.updateInstance).toHaveBeenCalledWith("i-1", {
      currentState: "approved",
      status: "completed",
      completedAt: expect.any(Date),
    });
    expect(repoMock.recordTransition).toHaveBeenCalledWith({
      instanceId: "i-1",
      fromState: "pending",
      toState: "approved",
      transition: "approve",
      actorUserId: "u-1",
      payload: { note: "LGTM" },
    });
  });
});
