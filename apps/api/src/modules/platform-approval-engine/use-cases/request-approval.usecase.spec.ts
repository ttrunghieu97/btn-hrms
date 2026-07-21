import { NotFoundException, BadRequestException } from "@nestjs/common";
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

  it("throws when policy not found", async () => {
    const repo = makeRepo();
    repo.findPolicyById.mockResolvedValue(null);
    const uc = new RequestApprovalUseCase(repo as any, makeOutbox() as any);
    await expect(uc.execute({ policyId: "x", subjectType: "leave", subjectId: "s" } as any))
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
    const result = await uc.execute({ policyId: "policy-1", subjectType: "leave", subjectId: "dup" } as any);
    expect(result).toEqual({ id: "existing" });
  });

  it("creates request + steps + stages event on success", async () => {
    const repo = makeRepo();
    const outbox = makeOutbox();
    repo.findPolicyById.mockResolvedValue(mockPolicy);
    repo.transaction.mockImplementation(async (cb: any) => {
      repo.findRequestBySubject.mockResolvedValue(null);
      repo.insertRequest.mockResolvedValue({ id: "req-1" });
      return cb({});
    });
    const uc = new RequestApprovalUseCase(repo as any, outbox as any);
    await uc.execute({ policyId: "policy-1", subjectType: "leave", subjectId: "s-1", requestedByUserId: "user-1" } as any);
    expect(repo.insertSteps).toHaveBeenCalled();
    expect(outbox.stage).toHaveBeenCalled();
  });
});
