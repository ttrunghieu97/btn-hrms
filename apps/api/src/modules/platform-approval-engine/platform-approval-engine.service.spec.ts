import { PlatformApprovalEngineService } from "./platform-approval-engine.service";

describe(PlatformApprovalEngineService.name, () => {
  it("rejects decisions from users who are not assigned to the approval step", async () => {
    const repo = {
      findRequestById: jest.fn().mockResolvedValue({ id: "req-1", status: "pending" }),
      findStep: jest.fn().mockResolvedValue({
        id: "step-1",
        status: "pending",
        approverUserId: "approver-1",
      }),
      updateStep: jest.fn(),
      updateRequest: jest.fn(),
      anyPendingStep: jest.fn(),
    };
    const service = new PlatformApprovalEngineService(repo as any);

    await expect(
      service.decideStep({
        requestId: "req-1",
        stepIndex: 0,
        decision: "approve",
        decidedByUserId: "user-2",
      }),
    ).rejects.toThrow("Approval step is assigned to another approver");

    expect(repo.updateStep).not.toHaveBeenCalled();
  });
});
