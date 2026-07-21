/**
 * workflow-engine.revision-limit.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit tests for the revision-limit enforcement feature (tasks 5.1–5.3).
 */

import { WorkflowEngine } from "../../platform-workflow-engine/tasks/workflow-engine";
import { UnprocessableEntityException } from "@nestjs/common";

function makeEngine(overrides: {
  task?: Partial<any>;
  slaRule?: Partial<any> | null;
  validateResult?: Partial<any>;
}) {
  const task = {
    id: "task-1",
    title: "Test task",
    status: "submitted",
    assigneeId: "emp-1",
    createdByUserId: "user-2",
    priority: "high",
    revisionCount: 0,
    ...overrides.task,
  };

  const slaRule =
    overrides.slaRule !== undefined
      ? overrides.slaRule
      : {
          maxRevisionCount: 3,
          notifyBeforeMinutes: null,
          maxDurationMinutes: 60,
        };

  const tx: any = {};
  const db: any = {
    query: {
      tasks: {
        findFirst: jest.fn().mockResolvedValue(task),
      },
      taskSlaRules: {
        findFirst: jest.fn().mockResolvedValue(slaRule),
      },
    },
    update: jest.fn(),
    transaction: jest.fn(async (cb: (trx: any) => Promise<any>) => cb(tx)),
  };
  tx.query = db.query;
  tx.update = db.update;

  const tasksRepo = {
    findById: jest.fn().mockResolvedValue(task),
    updateById: jest.fn().mockResolvedValue(undefined),
    updateWithOptimisticLock: jest
      .fn()
      .mockResolvedValue({ ...task, status: "revision" }),
    update: jest.fn().mockResolvedValue(undefined),
    addActivity: jest.fn().mockResolvedValue(undefined),
    addAssignment: jest.fn().mockResolvedValue(undefined),
    getUserIdByEmployeeId: jest.fn().mockResolvedValue("user-1"),
    getMaxSubmissionVersion: jest.fn().mockResolvedValue(0),
    addSubmission: jest.fn().mockResolvedValue(undefined),
  };

  const validateResult = {
    targetStatus: "revision",
    transition: "request_revision",
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

  const notifications = { create: jest.fn().mockResolvedValue(undefined) };
  const taskEvents = { publishTaskEvent: jest.fn() };
  const eventPublisher = { publish: jest.fn().mockResolvedValue(undefined) };
  const workflowRepo = {
    transaction: jest.fn(async (cb: (trx: any) => Promise<any>) => cb(tx)),
    listBlockingDependencies: jest.fn().mockResolvedValue([]),
    getMaxRevisionCountForPriority: jest
      .fn()
      .mockResolvedValue(slaRule?.maxRevisionCount ?? null),
  };
  const sideEffects = {
    apply: jest.fn().mockImplementation(async (_task, _cmd, _nextStatus, trx) => {
      await tasksRepo.update(
        "task-1",
        { revisionCount: (task.revisionCount ?? 0) + 1 },
        trx,
      );
    }),
  };

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

  return { engine, db, tasksRepo, eventPublisher, notifications, sideEffects };
}

describe("WorkflowEngine – revision limit enforcement", () => {
  it("allows request_revision when revision count is below the limit", async () => {
    const { engine, tasksRepo } = makeEngine({
      task: { status: "submitted", revisionCount: 1 },
      slaRule: { maxRevisionCount: 3, maxDurationMinutes: 60 },
    });

    const actor = {
      id: "user-2",
      username: "mgr",
      departmentId: null,
      isSuperAdmin: false,
      permissions: ["tasks:manage"],
      roles: ["manager"],
    };
    const result = await engine.execute({
      taskId: "task-1",
      actor,
      transition: "request_revision",
      data: { reason: "Needs fixing" },
    });

    expect(result.task).toBeDefined();
    expect(tasksRepo.update).toHaveBeenCalledWith(
      "task-1",
      { revisionCount: 2 },
      expect.anything(),
    );
  });

  it("blocks request_revision when revision count meets the limit", async () => {
    const { engine, eventPublisher } = makeEngine({
      task: { status: "submitted", revisionCount: 3, priority: "high" },
      slaRule: { maxRevisionCount: 3, maxDurationMinutes: 60 },
    });

    const actor = {
      id: "user-2",
      username: "mgr",
      departmentId: null,
      isSuperAdmin: false,
      permissions: ["tasks:manage"],
      roles: ["manager"],
    };
    await expect(
      engine.execute({
        taskId: "task-1",
        actor,
        transition: "request_revision",
        data: { reason: "Another fix" },
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);

    // Should have published the revision_limit_reached event
    expect(eventPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "task.revision_limit_reached" }),
    );
  });

  it("does not enforce revision limit when no SLA rule is configured", async () => {
    const { engine, tasksRepo } = makeEngine({
      task: { status: "submitted", revisionCount: 99, priority: "low" },
      slaRule: null, // no SLA rule
    });

    const actor = {
      id: "user-2",
      username: "mgr",
      departmentId: null,
      isSuperAdmin: false,
      permissions: ["tasks:manage"],
      roles: ["manager"],
    };
    const result = await engine.execute({
      taskId: "task-1",
      actor,
      transition: "request_revision",
      data: { reason: "Fix it" },
    });

    expect(result.task).toBeDefined();
    // revisionCount should be incremented
    expect(tasksRepo.update).toHaveBeenCalledWith(
      "task-1",
      { revisionCount: 100 },
      expect.anything(),
    );
  });

  it("does not enforce revision limit when maxRevisionCount is null", async () => {
    const { engine, tasksRepo } = makeEngine({
      task: { status: "submitted", revisionCount: 5, priority: "medium" },
      slaRule: { maxRevisionCount: null, maxDurationMinutes: 60 },
    });

    const actor = {
      id: "user-2",
      username: "mgr",
      departmentId: null,
      isSuperAdmin: false,
      permissions: ["tasks:manage"],
      roles: ["manager"],
    };
    const result = await engine.execute({
      taskId: "task-1",
      actor,
      transition: "request_revision",
      data: { reason: "Fix it again" },
    });

    expect(result.task).toBeDefined();
    expect(tasksRepo.update).toHaveBeenCalledWith(
      "task-1",
      { revisionCount: 6 },
      expect.anything(),
    );
  });
});
