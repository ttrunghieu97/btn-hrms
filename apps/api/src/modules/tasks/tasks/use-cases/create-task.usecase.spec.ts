import { CreateTaskUseCase } from "./create-task.usecase";

describe(CreateTaskUseCase.name, () => {
  it("stages created event inside transaction", async () => {
    const tx = { name: "tx" };
    const created = { id: "t1", title: "Task", status: "created" };
    const txRepo = { transaction: jest.fn().mockImplementation(async (fn) => fn(tx)) };
    const tasksRepo = {
      insert: jest.fn().mockResolvedValue(created),
      addActivity: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(created),
    };
    const eventOutbox = { stage: jest.fn().mockResolvedValue(undefined) };

    const useCase = new CreateTaskUseCase(
      txRepo as any,
      tasksRepo as any,
      { create: jest.fn() } as any,
      { publishTaskEvent: jest.fn() } as any,
      eventOutbox as any,
      { get: jest.fn().mockReturnValue({}) } as any,
    );

    await useCase.execute({ title: "Task" }, "u1");

    expect(eventOutbox.stage).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "task.created" }),
      tx,
    );
  });
});
