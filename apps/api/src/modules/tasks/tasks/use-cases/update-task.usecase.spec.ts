import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { UpdateTaskUseCase } from "./update-task.usecase";
import { Permissions } from "../../../../core/security/permissions/permissions.registry";

describe("UpdateTaskUseCase", () => {
  function makeUseCase(overrides: Partial<any> = {}) {
    const db = {
      transaction: jest.fn(async (cb: (tx: any) => Promise<any>) => cb({})),
    };
    const tasksRepo = {
      findById: jest.fn(),
      updateById: jest.fn(),
      addAssignment: jest.fn(),
      getUserIdByEmployeeId: jest.fn(),
      addActivity: jest.fn(),
    };
    const notifications = { create: jest.fn() };
    const taskEvents = { publishTaskEvent: jest.fn() };

    const usecase = new UpdateTaskUseCase(
      db as any,
      tasksRepo as any,
      notifications as any,
      taskEvents as any,
      {} as any,
    );

    Object.assign(usecase as any, overrides);
    return { usecase, tasksRepo };
  }

  it("blocks invalid status transitions", async () => {
    const { usecase, tasksRepo } = makeUseCase();
    tasksRepo.findById.mockResolvedValue({
      id: "task-1",
      title: "Task",
      status: "created",
      assigneeId: null,
      createdByUserId: "user-1",
    });

    const actor = { id: "user-1", isSuperAdmin: true };

    await expect(
      usecase.execute("task-1", { status: "completed" } as any, actor as any),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(tasksRepo.updateById).not.toHaveBeenCalled();
  });

  it("blocks managers outside department scope", async () => {
    const { usecase, tasksRepo } = makeUseCase();
    tasksRepo.findById.mockResolvedValue({
      id: "task-1",
      title: "Task",
      status: "assigned",
      assigneeId: "emp-2",
      assignee: { department: { id: "dept-2" } },
      createdByUserId: "user-1",
    });

    const actor = {
      id: "user-9",
      departmentId: "dept-1",
      permissions: [Permissions.TASKS_EDIT],
    };

    await expect(
      usecase.execute("task-1", { title: "New title" } as any, actor as any),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(tasksRepo.updateById).not.toHaveBeenCalled();
  });
});
