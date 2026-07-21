import { StartWorkflowInstanceUseCase } from "./start-workflow-instance.usecase";

describe("StartWorkflowInstanceUseCase", () => {
  it("delegates to service.startWorkflow", async () => {
    const svc = { startWorkflow: jest.fn().mockResolvedValue({ id: "wf-1" }) };
    const uc = new StartWorkflowInstanceUseCase(svc as any);
    const dto = { key: "leave", subjectType: "leave", subjectId: "s-1", metadata: {} } as any;
    const result = await uc.execute(dto, "user-1");
    expect(result).toEqual({ id: "wf-1" });
    expect(svc.startWorkflow).toHaveBeenCalledWith({
      key: "leave", subjectType: "leave", subjectId: "s-1", actorUserId: "user-1", metadata: {},
    });
  });
});
