/**
 * workflow-engine.cancel.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit tests for cancel transition behavior (task 4.5).
 */

import { WorkflowEngine } from "../../platform-workflow-engine/tasks/workflow-engine";
import { BadRequestException, ForbiddenException } from "@nestjs/common";

function makeEngine(overrides: {
  task?: Partial<any>;
  validateResult?: Partial<any>;
}) {
  const task = {
    id: "task-1",
    title: "Test task",
    status: "assigned",
    assigneeId: "emp-1",
    createdByUserId: "user-creator",
    priority: "medium",
    revisionCount: 0,
    ...overrides.task,
  };

  const tx: any = {};
  const db: any = {
    query: {
      taskSlaRules: {
        findFirst: jest.fn().mockResolvedValue({
          maxRevisionCount: 3,
          notifyBeforeMinutes: null,
          maxDurationMinutes: 60,
        }),
      },
      taskDependencies: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    },
    transaction: jest.fn(async (cb: (trx: any) => Promise<any>) => cb(tx)),
  };
  tx.query = db.query;

  const tasksRepo = {
    findById: jest.fn().mockResolvedValue(task),
    updateWithOptimisticLock: jest.fn().mockResolvedValue({
      ...task,
      status: "cancelled",
      cancellationReason: "No longer needed",
    }),
    update: jest.fn().mockResolvedValue(undefined),
    addActivity: jest.fn().mockResolvedValue(undefined),
    addAssignment: jest.fn().mockResolvedValue(undefined),
    getUserIdByEmployeeId: jest.fn().mockResolvedValue("user-assignee"),
    getNextSubmissionVersion: jest.fn().mockResolvedValue(0),
    addSubmission: jest.fn().mockResolvedValue(undefined),
  };

  const validateResult = {
    targetStatus: "cancelled",
    transition: "cancel",
    requiresReason: true,
    actorRoles: ["manager"],
    isDelegated: false,
    delegatorUserId: null,
    delegationScope: null,
    delegationDepartmentId: null,
    ...overrides.validateResult,
  };

  const transitionValidator = {
    validate: jest.fn().mockResolvedValue(validateResult),
    getAllowedTransitions: jest.fn().mockResolvedValue([]),
  };

  const taskEvents = { publishTaskEvent: jest.fn() };
  const eventPublisher = { publish: jest.fn().mockResolvedValue(undefined) };
  const workflowRepo = {
    transaction: jest.fn(async (cb: (trx: any) => Promise<any>) => cb(tx)),
    listBlockingDependencies: jest.fn().mockResolvedValue([]),
    getMaxRevisionCountForPriority: jest.fn().mockResolvedValue(null),
  };
  const sideEffects = { apply: jest.fn().mockResolvedValue(undefined) };

  const engine = new WorkflowEngine(
    tasksRepo as any,
    taskEvents as any,
    eventPublisher as any,
    transitionValidator as any,
    {
      executeAction: jest.fn().mockResolvedValue({ status: "completed" }),
    },
    workflowRepo as any,
    sideEffects as any,
  );

  return { engine, tasksRepo, transitionValidator };
}

describe("WorkflowEngine – cancel transition", () => {
  it("cancels when a manager provides a reason", async () => {
    const { engine, tasksRepo, transitionValidator } = makeEngine({
      task: { status: "assigned" },
    });

    const actor = {
      id: "user-manager",
      username: "manager",
      departmentId: null,
      isSuperAdmin: false,
      permissions: ["tasks:manage"],
      roles: ["manager"],
    };

    const result = await engine.execute({
      taskId: "task-1",
      actor,
      transition: "cancel",
      data: { reason: "No longer needed" },
    });

    expect(result.nextStatus).toBe("cancelled");
    expect(transitionValidator.validate).toHaveBeenCalled();
    expect(tasksRepo.updateWithOptimisticLock).toHaveBeenCalledWith(
      "task-1",
      "assigned",
      expect.objectContaining({
        status: "cancelled",
        cancellationReason: "No longer needed",
      }),
      expect.anything(),
    );
  });

  it("rejects cancel without a reason", async () => {
    const { engine, transitionValidator } = makeEngine({});
    transitionValidator.validate.mockRejectedValue(
      new BadRequestException('Transition "cancel" requires a reason'),
    );

    const actor = {
      id: "user-manager",
      username: "manager",
      departmentId: null,
      isSuperAdmin: false,
      permissions: ["tasks:manage"],
      roles: ["manager"],
    };

    await expect(
      engine.execute({
        taskId: "task-1",
        actor,
        transition: "cancel",
        data: {},
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects cancel when actor is assignee only", async () => {
    const { engine, transitionValidator } = makeEngine({});
    transitionValidator.validate.mockRejectedValue(
      new ForbiddenException(
        'You do not have permission to perform "cancel" on this task',
      ),
    );

    const actor = {
      id: "user-assignee",
      username: "assignee",
      departmentId: null,
      isSuperAdmin: false,
      permissions: [],
      roles: ["employee"],
      employeeId: "emp-1",
    };

    await expect(
      engine.execute({
        taskId: "task-1",
        actor,
        transition: "cancel",
        data: { reason: "Trying to cancel" },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects cancel from completed state", async () => {
    const { engine, transitionValidator, tasksRepo } = makeEngine({
      task: { status: "completed" },
    });
    transitionValidator.validate.mockRejectedValue(
      new BadRequestException("Invalid transition: completed → cancel"),
    );

    const actor = {
      id: "user-manager",
      username: "manager",
      departmentId: null,
      isSuperAdmin: false,
      permissions: ["tasks:manage"],
      roles: ["manager"],
    };

    await expect(
      engine.execute({
        taskId: "task-1",
        actor,
        transition: "cancel",
        data: { reason: "Too late" },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tasksRepo.updateWithOptimisticLock).not.toHaveBeenCalled();
  });
});
