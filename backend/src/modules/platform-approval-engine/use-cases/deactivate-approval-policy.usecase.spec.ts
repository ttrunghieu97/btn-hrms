import { NotFoundException } from "@nestjs/common";
import { DeactivateApprovalPolicyUseCase } from "./deactivate-approval-policy.usecase";

describe("DeactivateApprovalPolicyUseCase", () => {
  const makeRepo = () => ({ findPolicyById: jest.fn(), deactivatePolicy: jest.fn() });

  it("throws when policy not found", async () => {
    const repo = makeRepo(); repo.findPolicyById.mockResolvedValue(null);
    const uc = new DeactivateApprovalPolicyUseCase(repo as any);
    await expect(uc.execute("x")).rejects.toThrow(NotFoundException);
  });

  it("deactivates policy", async () => {
    const repo = makeRepo();
    repo.findPolicyById.mockResolvedValue({ id: "p" });
    const uc = new DeactivateApprovalPolicyUseCase(repo as any);
    await uc.execute("p");
    expect(repo.deactivatePolicy).toHaveBeenCalledWith("p");
  });
});
