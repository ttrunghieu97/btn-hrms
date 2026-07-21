/**
 * task-sla.service.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit tests for SLA clock anchoring and approval latency checks (task 6.4).
 */

import { TaskSlaService } from "./task-sla.service";

function makeService(overrides?: { activeTasks?: any[]; submittedTasks?: any[]; slaRule?: any; }) {
  const activeTasks = overrides?.activeTasks ?? [];
  const submittedTasks = overrides?.submittedTasks ?? [];
  const slaRule = overrides?.slaRule ?? {
    maxDurationMinutes: 60,
    notifyBeforeMinutes: null,
    approvalLatencyMinutes: 15,
    escalateToUserId: "admin-1",
    priority: "high",
  };;

  const repo = {
    setTenantContext: jest.fn(),
    findActiveTasks: jest.fn().mockResolvedValue(activeTasks),
    findSubmittedTasks: jest.fn().mockResolvedValue(submittedTasks),
    findSlaRulesByPriorities: jest.fn().mockResolvedValue([slaRule]),
  };

  const notifications = { create: jest.fn().mockResolvedValue(undefined) };
  const eventPublisher = { publish: jest.fn().mockResolvedValue(undefined) };

  const redis = {
    getClient: () => ({ status: "ready", set: jest.fn().mockResolvedValue("OK"), eval: jest.fn().mockResolvedValue(1) }),
    getClientOrNull: () => ({ status: "ready", set: jest.fn().mockResolvedValue("OK"), eval: jest.fn().mockResolvedValue(1) })
  };
  repo.findActiveTasks = jest.fn().mockResolvedValue(activeTasks);
  repo.findSubmittedTasks = jest.fn().mockResolvedValue(submittedTasks);

  const service = new TaskSlaService(
    repo as any,
    notifications as any,
    eventPublisher as any,
    redis as any,
  );

  return { service, repo, notifications, eventPublisher };
}

describe("TaskSlaService", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2024-01-01T10:00:00Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("uses startedAt as SLA clock anchor when present", async () => {
    const startedAt = new Date("2024-01-01T08:00:00Z");
    const createdAt = new Date("2024-01-01T07:00:00Z");

    const { service, eventPublisher } = makeService({
      activeTasks: [
        {
          id: "task-1",
          title: "Task",
          status: "in_progress",
          priority: "high",
          assigneeId: "emp-1",
          createdAt,
          startedAt,
        },
      ],
      submittedTasks: [],
      slaRule: {
        maxDurationMinutes: 60,
        notifyBeforeMinutes: null,
        approvalLatencyMinutes: null,
        escalateToUserId: "admin-1",
        priority: "high",
      },
    });

    await service.checkSlaBreaches();

    expect(eventPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "task.overdue",
        payload: expect.objectContaining({
          dueDate: new Date(startedAt.getTime() + 60 * 60_000).toISOString(),
        }),
      }),
    );
  });

  it("falls back to createdAt when startedAt is missing", async () => {
    const createdAt = new Date("2024-01-01T08:00:00Z");

    const { service, eventPublisher } = makeService({
      activeTasks: [
        {
          id: "task-2",
          title: "Task",
          status: "assigned",
          priority: "high",
          assigneeId: "emp-2",
          createdAt,
          startedAt: null,
        },
      ],
      submittedTasks: [],
      slaRule: {
        maxDurationMinutes: 60,
        notifyBeforeMinutes: null,
        approvalLatencyMinutes: null,
        escalateToUserId: "admin-1",
        priority: "high",
      },
    });

    await service.checkSlaBreaches();

    expect(eventPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "task.overdue",
        payload: expect.objectContaining({
          dueDate: new Date(createdAt.getTime() + 60 * 60_000).toISOString(),
        }),
      }),
    );
  });

  it("publishes approval overdue event for submitted tasks", async () => {
    const submittedAt = new Date("2024-01-01T09:00:00Z");

    const { service, eventPublisher } = makeService({
      activeTasks: [],
      submittedTasks: [
        {
          id: "task-3",
          title: "Submitted task",
          status: "submitted",
          priority: "high",
          assigneeId: "emp-3",
          submittedAt,
        },
      ],
      slaRule: {
        maxDurationMinutes: 60,
        notifyBeforeMinutes: null,
        approvalLatencyMinutes: 30,
        escalateToUserId: "admin-1",
        priority: "high",
      },
    });

    await service.checkSlaBreaches();

    expect(eventPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "task.approval_overdue",
        payload: expect.objectContaining({
          submittedAt: submittedAt.toISOString(),
        }),
      }),
    );
  });
});
