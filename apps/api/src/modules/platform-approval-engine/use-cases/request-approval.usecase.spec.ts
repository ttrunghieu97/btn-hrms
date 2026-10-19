import { NotFoundException, ForbiddenException } from "@nestjs/common";
import { RequestApprovalUseCase } from "./request-approval.usecase";

describe("RequestApprovalUseCase", () => {
  const mockPolicy = {
    id: "policy-1", key: "leave_approval", steps: { steps: [{ approverUserId: "approver-1" }] },
  };
  const makeRepo = () => ({
    findPolicyById: jest.fn(),
    findRequestBySubject: jest.fn(),
    insertRequest: jest.fn(),
    insertSteps: jest.fn(),
    transaction: jest.fn(async (cb: any) => cb({})),
  });
  const makeOutbox = () => ({ stage: jest.fn() });

  it("throws ForbiddenException when authenticated user identity is missing", async () => {
    const repo = makeRepo();
    const uc = new RequestApprovalUseCase(repo as any, makeOutbox() as any);
    await expect(
      uc.execute({ policyId: "policy-1", subjectType: "leave", subjectId: "s" }, ""),
    ).rejects.toThrow(ForbiddenException);
  });

  it("throws when policy not found", async () => {
    const repo = makeRepo();
    repo.findPolicyById.mockResolvedValue(null);
    const uc = new RequestApprovalUseCase(repo as any, makeOutbox() as any);
    await expect(uc.execute({ policyId: "x", subjectType: "leave", subjectId: "s" }, "user-1"))
      .rejects.toThrow(NotFoundException);
  });

  it("returns existing request if duplicate subject", async () => {
    const repo = makeRepo();
    repo.findPolicyById.mockResolvedValue(mockPolicy);
    repo.transaction.mockImplementation(async (cb: any) => {
      repo.findRequestBySubject.mockResolvedValue({ id: "existing" });
      return cb({});
    });
    const uc = new RequestApprovalUseCase(repo as any, makeOutbox() as any);
    const result = await uc.execute(
      { policyId: "policy-1", subjectType: "leave", subjectId: "dup" },
      "user-1",
    );
    expect(result).toEqual({ id: "existing" });
  });

  it("creates request + steps + stages event on success using authenticated principal", async () => {
    const repo = makeRepo();
    const outbox = makeOutbox();
    repo.findPolicyById.mockResolvedValue(mockPolicy);
    repo.transaction.mockImplementation(async (cb: any) => {
      repo.findRequestBySubject.mockResolvedValue(null);
      repo.insertRequest.mockResolvedValue({ id: "req-1" });
      return cb({});
    });
    const uc = new RequestApprovalUseCase(repo as any, outbox as any);
    await uc.execute(
      { policyId: "policy-1", subjectType: "leave", subjectId: "s-1" },
      "user-1",
    );
    expect(repo.insertRequest).toHaveBeenCalledWith(
      expect.objectContaining({ requestedByUserId: "user-1" }),
      expect.anything(),
    );
    expect(repo.insertSteps).toHaveBeenCalled();
    expect(outbox.stage).toHaveBeenCalled();
  });
});
