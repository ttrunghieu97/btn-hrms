import { TransitionWorkflowInstanceUseCase } from "./transition-workflow-instance.usecase";

describe("TransitionWorkflowInstanceUseCase", () => {
  it("delegates to service.transition", async () => {
    const svc = { transition: jest.fn().mockResolvedValue({ status: "completed" }) };
    const uc = new TransitionWorkflowInstanceUseCase(svc as any);
    const dto = { transition: "approve", payload: { comment: "ok" } } as any;
    const result = await uc.execute("inst-1", dto, "user-1");
    expect(result).toEqual({ status: "completed" });
    expect(svc.transition).toHaveBeenCalledWith("inst-1", "approve", "user-1", { comment: "ok" });
  });
});
