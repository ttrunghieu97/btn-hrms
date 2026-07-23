import { AcceptTaskUseCase } from "./accept-task.usecase";

describe("AcceptTaskUseCase", () => {
  function makeUseCase() {
    const workflowEngine = {
      execute: jest.fn(),
    };
    const tasksRepo = {
      findById: jest.fn(),
    };

    const usecase = new AcceptTaskUseCase(
      workflowEngine as any,
      tasksRepo as any,
      {} as any,
    );
    return { usecase, workflowEngine, tasksRepo };
  }

  it("requires the task to be visible before delegating to WorkflowEngine", async () => {
    const { usecase, workflowEngine, tasksRepo } = makeUseCase();
    const task = { id: "task-1", title: "Task", status: "in_progress" };
    tasksRepo.findById.mockResolvedValue(task);
    workflowEngine.execute.mockResolvedValue({ task });

    const actor = { id: "user-1", employeeId: "emp-1" } as any;
    const result = await usecase.execute("task-1", actor);

    expect(tasksRepo.findById).toHaveBeenCalledWith("task-1");
    expect(workflowEngine.execute).toHaveBeenCalledWith({
      taskId: "task-1",
      actor,
      transition: "accept",
    });
    expect(result).toBe(task);
  });

  it("fails closed when the task is out of scope or missing", async () => {
    const { usecase, workflowEngine, tasksRepo } = makeUseCase();
    tasksRepo.findById.mockResolvedValue(null);

    const actor = { id: "user-1", employeeId: "emp-1" } as any;
    await expect(usecase.execute("task-1", actor)).rejects.toThrow(
      "Task not found",
    );
    expect(workflowEngine.execute).not.toHaveBeenCalled();
  });
});
