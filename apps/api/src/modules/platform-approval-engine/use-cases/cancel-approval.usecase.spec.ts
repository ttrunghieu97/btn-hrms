import { NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { CancelApprovalUseCase } from "./cancel-approval.usecase";
import { Permissions } from "../../../core/security/permissions/permissions.registry";

describe("CancelApprovalUseCase", () => {
  const makeRepo = () => ({
    findRequestById: jest.fn(),
    findStep: jest.fn(),
    updateStep: jest.fn(),
    skipPendingSteps: jest.fn(),
    updateRequest: jest.fn(),
    updateRequestIfPending: jest.fn(),
    transaction: jest.fn(async (cb: any) => cb({ __tx: true })),
  });
  const makeOutbox = () => ({ stage: jest.fn() });

  it("throws when request not found", async () => {
    const repo = makeRepo();
    repo.findRequestById.mockResolvedValue(null);
    const uc = new CancelApprovalUseCase(repo as any, makeOutbox() as any);
    await expect(uc.execute("x", { id: "user-1" })).rejects.toThrow(NotFoundException);
  });

  it("throws when request not pending", async () => {
    const repo = makeRepo();
    repo.findRequestById.mockResolvedValue({
      id: "r",
      status: "approved",
      requestedByUserId: "user-1",
    });
    const uc = new CancelApprovalUseCase(repo as any, makeOutbox() as any);
    await expect(uc.execute("r", { id: "user-1" })).rejects.toThrow(BadRequestException);
  });

  it("rejects cancellation by another user who only holds generic request/cancel permissions", async () => {
    const repo = makeRepo();
    repo.findRequestById.mockResolvedValue({
      id: "r",
      status: "pending",
      requestedByUserId: "user-owner",
      subjectType: "leave",
      subjectId: "s",
    });
    const uc = new CancelApprovalUseCase(repo as any, makeOutbox() as any);
    await expect(
      uc.execute("r", {
        id: "user-other",
        permissions: [Permissions.APPROVAL_REQUESTS_CREATE, Permissions.APPROVAL_REQUESTS_CANCEL],
        roles: ["EMPLOYEE"],
      }),
    ).rejects.toThrow(ForbiddenException);
    expect(repo.skipPendingSteps).not.toHaveBeenCalled();
  });

  it("allows requester to cancel pending request and stages event with decidedByUserId inside transaction", async () => {
    const repo = makeRepo();
    const outbox = makeOutbox();
    repo.findRequestById.mockResolvedValue({
      id: "r",
      status: "pending",
      requestedByUserId: "user-owner",
      subjectType: "leave",
      subjectId: "s",
      currentStepIndex: 0,
    });
    repo.updateRequestIfPending.mockResolvedValue({ id: "r", status: "cancelled" });
    const uc = new CancelApprovalUseCase(repo as any, outbox as any);
    await uc.execute("r", { id: "user-owner" });
    expect(repo.findRequestById).toHaveBeenCalledWith("r", { __tx: true });
    expect(repo.skipPendingSteps).toHaveBeenCalledWith("r", { __tx: true });
    expect(repo.updateRequestIfPending).toHaveBeenCalledWith(
      "r",
      expect.objectContaining({ status: "cancelled" }),
      { __tx: true },
    );
    expect(outbox.stage).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          approvalRequestId: "r",
          outcome: "cancelled",
          decidedByUserId: "user-owner",
        }),
      }),
      { __tx: true },
    );
  });

  it("allows an explicitly authorized administrator to cancel another user's pending request", async () => {
    const repo = makeRepo();
    const outbox = makeOutbox();
    repo.findRequestById.mockResolvedValue({
      id: "r",
      status: "pending",
      requestedByUserId: "user-owner",
      subjectType: "leave",
      subjectId: "s",
    });
    repo.updateRequestIfPending.mockResolvedValue({ id: "r", status: "cancelled" });
    const uc = new CancelApprovalUseCase(repo as any, outbox as any);
    await uc.execute("r", {
      id: "user-admin",
      isSuperAdmin: false,
      permissions: [Permissions.APPROVAL_POLICIES_EDIT],
      roles: ["HR_ADMIN"],
    });
    expect(repo.skipPendingSteps).toHaveBeenCalledWith("r", { __tx: true });
    expect(outbox.stage).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          approvalRequestId: "r",
          outcome: "cancelled",
          decidedByUserId: "user-admin",
        }),
      }),
      { __tx: true },
    );
  });
});
