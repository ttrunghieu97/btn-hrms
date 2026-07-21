import { NotFoundException, BadRequestException } from "@nestjs/common";
import { DecideApprovalStepUseCase } from "./decide-approval-step.usecase";

describe("DecideApprovalStepUseCase", () => {
  const makeRepo = () => ({
    findRequestById: jest.fn(),
    findStep: jest.fn(),
    updateStep: jest.fn(),
    updateRequest: jest.fn(),
    anyPendingStep: jest.fn(),
    transaction: jest.fn(async (cb: any) => cb({})),
  });
  const makeOutbox = () => ({ stage: jest.fn() });

  it("throws when request not found", async () => {
    const repo = makeRepo(); repo.findRequestById.mockResolvedValue(null);
    const uc = new DecideApprovalStepUseCase(repo as any, makeOutbox() as any);
    await expect(uc.execute({ requestId: "x", stepIndex: 0, decision: "approve" } as any, "user-1"))
      .rejects.toThrow(NotFoundException);
  });

  it("throws when request already decided", async () => {
    const repo = makeRepo();
    repo.findRequestById.mockResolvedValue({ id: "r", status: "approved" });
    const uc = new DecideApprovalStepUseCase(repo as any, makeOutbox() as any);
    await expect(uc.execute({ requestId: "r", stepIndex: 0, decision: "approve" } as any, "user-1"))
      .rejects.toThrow(BadRequestException);
  });

  it("throws when step assigned to different approver", async () => {
    const repo = makeRepo();
    repo.findRequestById.mockResolvedValue({ id: "r", status: "pending" });
    repo.findStep.mockResolvedValue({ id: "s", status: "pending", approverUserId: "other-user" });
    const uc = new DecideApprovalStepUseCase(repo as any, makeOutbox() as any);
    await expect(uc.execute({ requestId: "r", stepIndex: 0, decision: "approve" } as any, "user-1"))
      .rejects.toThrow(BadRequestException);
  });

  it("rejects request on reject decision", async () => {
    const repo = makeRepo();
    const outbox = makeOutbox();
    repo.findRequestById.mockResolvedValue({ id: "r", status: "pending", subjectType: "leave", subjectId: "s" });
    repo.findStep.mockResolvedValue({ id: "s", status: "pending", approverUserId: "user-1" });
    const uc = new DecideApprovalStepUseCase(repo as any, outbox as any);
    const result = await uc.execute({ requestId: "r", stepIndex: 0, decision: "reject", comment: "nope" } as any, "user-1");
    expect(result.status).toBe("rejected");
    expect(repo.updateRequest).toHaveBeenCalledWith("r", expect.objectContaining({ status: "rejected" }));
    expect(outbox.stage).toHaveBeenCalledTimes(2);
  });

  it("approves request when all steps done", async () => {
    const repo = makeRepo();
    const outbox = makeOutbox();
    repo.findRequestById.mockResolvedValue({ id: "r", status: "pending", subjectType: "leave", subjectId: "s" });
    repo.findStep.mockResolvedValue({ id: "s", status: "pending", approverUserId: "user-1" });
    repo.anyPendingStep.mockResolvedValue(false);
    const uc = new DecideApprovalStepUseCase(repo as any, outbox as any);
    const result = await uc.execute({ requestId: "r", stepIndex: 0, decision: "approve" } as any, "user-1");
    expect(result.status).toBe("approved");
    expect(outbox.stage).toHaveBeenCalledTimes(2);
  });

  it("advances to next step when more steps remain", async () => {
    const repo = makeRepo();
    repo.findRequestById.mockResolvedValue({ id: "r", status: "pending", subjectType: "leave", subjectId: "s" });
    repo.findStep.mockResolvedValue({ id: "s", status: "pending", approverUserId: "user-1" });
    repo.anyPendingStep.mockResolvedValue(true);
    const uc = new DecideApprovalStepUseCase(repo as any, makeOutbox() as any);
    const result = await uc.execute({ requestId: "r", stepIndex: 0, decision: "approve" } as any, "user-1");
    expect(result.status).toBe("pending");
    expect(repo.updateRequest).toHaveBeenCalledWith("r", expect.objectContaining({ currentStepIndex: 1 }));
  });
});
