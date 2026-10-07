import { ListTasksUseCase } from "./list-tasks.usecase";

describe(ListTasksUseCase.name, () => {
  it("delegates to scoped repository list", async () => {
    const tasksRepo = {
      list: jest.fn().mockResolvedValue({ rows: [], total: 0, page: 1, limit: 20 }),
    };

    const useCase = new ListTasksUseCase(tasksRepo as any, {} as any);
    await useCase.execute({ status: "open" } as any);

    expect(tasksRepo.list).toHaveBeenCalledWith({ status: "open" });
  });
});
