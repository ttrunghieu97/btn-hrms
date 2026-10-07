import { TasksRepository } from "./tasks.repository";

describe(TasksRepository.name, () => {
  it("lists tasks", async () => {
    const db = {
      query: {
        tasks: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      },
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ count: 0 }]),
        }),
      }),
    };

    const repo = new TasksRepository(db as any);
    await repo.list({ page: 1, limit: 20 });

    expect(db.query.tasks.findMany).toHaveBeenCalled();
  });

  it("finds task by id", async () => {
    const db = {
      query: {
        tasks: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      },
    };

    const repo = new TasksRepository(db as any);
    await repo.findById("task-1");

    expect(db.query.tasks.findFirst).toHaveBeenCalled();
  });

  it("updates task by id", async () => {
    const returning = jest.fn().mockResolvedValue([{ id: "task-1" }]);
    const where = jest.fn().mockReturnValue({ returning });
    const set = jest.fn().mockReturnValue({ where });
    const update = jest.fn().mockReturnValue({ set });
    const db = { update, query: { tasks: { findFirst: jest.fn() } } };

    const repo = new TasksRepository(db as any);
    await repo.updateById("task-1", { title: "Updated" });

    expect(update).toHaveBeenCalled();
    expect(where).toHaveBeenCalled();
  });

  it("deletes task by id", async () => {
    const returning = jest.fn().mockResolvedValue([{ id: "task-1" }]);
    const where = jest.fn().mockReturnValue({ returning });
    const set = jest.fn().mockReturnValue({ where });
    const update = jest.fn().mockReturnValue({ set });
    const db = { update, query: { tasks: { findFirst: jest.fn() } } };

    const repo = new TasksRepository(db as any);
    await repo.deleteById("task-1");

    expect(update).toHaveBeenCalled();
    expect(where).toHaveBeenCalled();
  });
});
