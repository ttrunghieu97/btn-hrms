import { NotFoundException, BadRequestException } from "@nestjs/common";
import { CancelApprovalUseCase } from "./cancel-approval.usecase";

describe("CancelApprovalUseCase", () => {
  const makeRepo = () => ({
    findRequestById: jest.fn(),
    findStep: jest.fn(),
    updateStep: jest.fn(),
    updateRequest: jest.fn(),
    transaction: jest.fn(async (cb: any) => cb({})),
  });
  const makeOutbox = () => ({ stage: jest.fn() });

  it("throws when request not found", async () => {
    const repo = makeRepo(); repo.findRequestById.mockResolvedValue(null);
    const uc = new CancelApprovalUseCase(repo as any, makeOutbox() as any);
    await expect(uc.execute("x")).rejects.toThrow(NotFoundException);
  });

  it("throws when request not pending", async () => {
    const repo = makeRepo();
    repo.findRequestById.mockResolvedValue({ id: "r", status: "approved" });
    const uc = new CancelApprovalUseCase(repo as any, makeOutbox() as any);
    await expect(uc.execute("r")).rejects.toThrow(BadRequestException);
  });

  it("cancels pending request and stages event", async () => {
    const repo = makeRepo();
    const outbox = makeOutbox();
    repo.findRequestById.mockResolvedValue({ id: "r", status: "pending", subjectType: "leave", subjectId: "s", currentStepIndex: 0 });
    repo.findStep.mockResolvedValue({ id: "s", status: "pending" });
    const uc = new CancelApprovalUseCase(repo as any, outbox as any);
    await uc.execute("r");
    expect(repo.updateStep).toHaveBeenCalledWith("s", expect.objectContaining({ status: "skipped" }));
    expect(repo.updateRequest).toHaveBeenCalledWith("r", expect.objectContaining({ status: "cancelled" }));
    expect(outbox.stage).toHaveBeenCalled();
  });
});
