/**
 * workflow-engine.event-publish.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Verifies reject/unassign transitions emit correct domain events (task 2.6).
 */

import { WorkflowEngine } from "../../platform-workflow-engine/tasks/workflow-engine";

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
    priority: "high",
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
    findById: jest
      .fn()
      .mockResolvedValueOnce(task)
      .mockResolvedValueOnce({ ...task, status: "declined" }),
    updateWithOptimisticLock: jest.fn().mockResolvedValue({
      ...task,
      status: "declined",
    }),
    update: jest.fn().mockResolvedValue(undefined),
    addActivity: jest.fn().mockResolvedValue(undefined),
    addAssignment: jest.fn().mockResolvedValue(undefined),
    getUserIdByEmployeeId: jest.fn().mockResolvedValue("user-assignee"),
    getNextSubmissionVersion: jest.fn().mockResolvedValue(0),
    addSubmission: jest.fn().mockResolvedValue(undefined),
  };

  const validateResult = {
    targetStatus: "declined",
    transition: "reject",
    requiresReason: true,
    actorRoles: ["assignee"],
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

  return {
    engine,
    eventPublisher,
    tasksRepo,
    taskEvents,
    transitionValidator,
  };
}

describe("WorkflowEngine – event publishing", () => {
  it("emits task.declined for reject transition", async () => {
    const { engine, eventPublisher, taskEvents, transitionValidator } =
      makeEngine({});

    const actor = {
      id: "user-assignee",
      username: "assignee",
      departmentId: null,
      isSuperAdmin: false,
      permissions: [],
      roles: ["employee"],
      employeeId: "emp-1",
    };

    await engine.execute({
      taskId: "task-1",
      actor,
      transition: "reject",
      data: { reason: "Cannot do" },
    });

    expect(transitionValidator.validate).toHaveBeenCalled();
    expect(eventPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "task.declined" }),
    );
    expect(taskEvents.publishTaskEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "task_declined" }),
    );
  });

  it("emits task.unassigned for unassign transition", async () => {
    const { engine, eventPublisher, tasksRepo, transitionValidator } =
      makeEngine({
        validateResult: {
          targetStatus: "created",
          transition: "unassign",
          requiresReason: false,
          actorRoles: ["manager"],
        },
      });

    tasksRepo.findById
      .mockResolvedValueOnce({
        id: "task-1",
        title: "Test task",
        status: "assigned",
        assigneeId: "emp-1",
        createdByUserId: "user-creator",
        priority: "high",
        revisionCount: 0,
      })
      .mockResolvedValueOnce({
        id: "task-1",
        title: "Test task",
        status: "created",
        assigneeId: null,
        createdByUserId: "user-creator",
        priority: "high",
        revisionCount: 0,
      });

    tasksRepo.updateWithOptimisticLock.mockResolvedValue({
      id: "task-1",
      status: "created",
    });

    const actor = {
      id: "user-manager",
      username: "manager",
      departmentId: null,
      isSuperAdmin: false,
      permissions: ["tasks:manage"],
      roles: ["manager"],
    };

    await engine.execute({
      taskId: "task-1",
      actor,
      transition: "unassign",
      data: {},
    });

    expect(transitionValidator.validate).toHaveBeenCalled();
    expect(eventPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "task.unassigned" }),
    );
  });
});
