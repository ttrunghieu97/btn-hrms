import { ApproveTaskUseCase } from "./approve-task.usecase";

describe(ApproveTaskUseCase.name, () => {
  it("fails closed when the task is out of scope or missing", async () => {
    const tasksRepo = { findById: jest.fn().mockResolvedValue(null) };
    const useCase = new ApproveTaskUseCase(
      { transaction: jest.fn() } as any,
      tasksRepo as any,
      { validate: jest.fn() } as any,
      { stage: jest.fn() } as any,
      { get: jest.fn().mockReturnValue({}) } as any,
    );

    await expect(useCase.execute("task-1", { id: "u1" } as any)).rejects.toThrow(
      "Task not found",
    );
  });

  it("updates status, writes activity, and stages completed event in one transaction", async () => {
    const tx = { name: "tx" };
    const task = { id: "t1", status: "submitted", assigneeId: "e1", createdByUserId: "u2", assignee: null, title: "Task" };
    const updated = { ...task, status: "completed" };
    const txRepo = { transaction: jest.fn().mockImplementation(async (fn) => fn(tx)) };
    const tasksRepo = {
      findById: jest.fn().mockResolvedValueOnce(task).mockResolvedValueOnce(updated),
      updateWithOptimisticLock: jest.fn().mockResolvedValue(updated),
      addActivity: jest.fn().mockResolvedValue(undefined),
    };
    const transitionValidator = { validate: jest.fn().mockResolvedValue({ targetStatus: "completed" }) };
    const eventOutbox = { stage: jest.fn().mockResolvedValue(undefined) };

    const useCase = new ApproveTaskUseCase(
      txRepo as any,
      tasksRepo as any,
      transitionValidator as any,
      eventOutbox as any,
      { get: jest.fn().mockReturnValue({}) } as any,
    );

    await useCase.execute("t1", { id: "u1" } as any);

    expect(txRepo.transaction).toHaveBeenCalledTimes(1);
    expect(tasksRepo.updateWithOptimisticLock).toHaveBeenCalledWith(
      "t1",
      "submitted",
      expect.objectContaining({ status: "completed", progress: "100" }),
      tx,
    );
    expect(tasksRepo.addActivity).toHaveBeenCalledWith(
      expect.objectContaining({ taskId: "t1", action: "approved" }),
      tx,
    );
    expect(eventOutbox.stage).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "task.completed" }),
      tx,
    );
  });
});
