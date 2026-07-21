import { RejectTaskUseCase } from "./reject-task.usecase";

describe("RejectTaskUseCase", () => {
  it("fails closed when the task is out of scope or missing", async () => {
    const workflowEngine = { execute: jest.fn() };
    const tasksRepo = { findById: jest.fn().mockResolvedValue(null) };
    const useCase = new RejectTaskUseCase(
      workflowEngine as any,
      tasksRepo as any,
      {} as any,
    );

    await expect(
      useCase.execute("task-1", { reason: "x" } as any, { id: "u1" } as any),
    ).rejects.toThrow("Task not found");
    expect(workflowEngine.execute).not.toHaveBeenCalled();
  });
});
