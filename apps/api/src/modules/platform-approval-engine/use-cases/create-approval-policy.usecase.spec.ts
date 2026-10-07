import { CreateApprovalPolicyUseCase } from "./create-approval-policy.usecase";

describe("CreateApprovalPolicyUseCase", () => {
  it("delegates to service.createPolicy", async () => {
    const service = { createPolicy: jest.fn().mockResolvedValue({ id: "p-1" }) };
    const uc = new CreateApprovalPolicyUseCase(service as any);
    const dto = { key: "leave", name: "Leave Approval", steps: { steps: [] } } as any;
    const result = await uc.execute(dto);
    expect(result).toEqual({ id: "p-1" });
    expect(service.createPolicy).toHaveBeenCalledWith({
      key: "leave", version: 1, name: "Leave Approval", description: null, steps: { steps: [] },
    });
  });
});
