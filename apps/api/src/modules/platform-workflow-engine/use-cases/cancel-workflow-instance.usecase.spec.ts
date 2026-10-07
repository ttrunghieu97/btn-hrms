import { CancelWorkflowInstanceUseCase } from "./cancel-workflow-instance.usecase";

describe("CancelWorkflowInstanceUseCase", () => {
  it("delegates to service.cancelInstance", async () => {
    const svc = { cancelInstance: jest.fn().mockResolvedValue({ status: "cancelled" }) };
    const uc = new CancelWorkflowInstanceUseCase(svc as any);
    const result = await uc.execute("inst-1", "user-1");
    expect(result).toEqual({ status: "cancelled" });
    expect(svc.cancelInstance).toHaveBeenCalledWith("inst-1", "user-1");
  });
});
