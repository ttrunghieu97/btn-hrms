import { EventOutboxRepository } from "./event-outbox.repository";

describe(EventOutboxRepository.name, () => {
  it("supports outbox insert through executor", async () => {
    const insertReturning = jest.fn().mockResolvedValue([{ id: "out-1" }]);
    const db = {
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: insertReturning,
        }),
      }),
      query: {
        eventOutbox: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      },
      execute: jest.fn().mockResolvedValue({ rows: [] }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ id: "out-1" }]),
          }),
        }),
      }),
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ count: 0, oldestCreatedAt: null }]),
        }),
      }),
    };

    const repo = new EventOutboxRepository(db as any);
    await repo.insert({
      eventId: "evt-1",
      eventType: "DemoEvent",
      eventVersion: 1,
      producerContext: "core",
      scopeId: "company-1",
      aggregateId: "emp-1",
      occurredAt: new Date().toISOString(),
      payload: { employeeId: "emp-1" },
      correlationId: null,
      causationId: null,
    });

    expect(db.insert).toHaveBeenCalled();
  });

  it("claims only due rows with attempts remaining", async () => {
    const db = {
      insert: jest.fn(),
      query: { eventOutbox: { findMany: jest.fn() } },
      execute: jest.fn().mockResolvedValue({ rows: [] }),
      update: jest.fn(),
      select: jest.fn(),
    };

    const repo = new EventOutboxRepository(db as any);
    await repo.claimUnpublished(10);

    expect(db.execute).toHaveBeenCalledWith(expect.any(Object));
  });

  it("returns unpublished summary", async () => {
    const where = jest.fn().mockResolvedValue([{ count: 2, oldestCreatedAt: new Date(Date.now() - 1000) }]);
    const db = {
      insert: jest.fn(),
      query: { eventOutbox: { findMany: jest.fn() } },
      execute: jest.fn().mockResolvedValue({ rows: [] }),
      update: jest.fn(),
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({ where }),
      }),
    };

    const repo = new EventOutboxRepository(db as any);
    const summary = await repo.getUnpublishedSummary();

    expect(summary.unpublishedCount).toBe(2);
    expect(summary.oldestUnpublishedAgeMs).toBeGreaterThanOrEqual(0);
    expect(where).toHaveBeenCalledWith(expect.any(Object));
  });

  it("marks exhausted failures as terminal", async () => {
    const set = jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ id: "out-1" }]),
      }),
    });
    const db = {
      insert: jest.fn(),
      query: { eventOutbox: { findMany: jest.fn() } },
      execute: jest.fn().mockResolvedValue({ rows: [] }),
      update: jest.fn().mockReturnValue({ set }),
      select: jest.fn(),
    };
    const attemptedAt = new Date("2026-01-01T00:00:00.000Z");

    const repo = new EventOutboxRepository(db as any);
    await repo.recordFailure("out-1", "redis down", attemptedAt, 12, 12);

    expect(set.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        attemptCount: 12,
        maxAttempts: 12,
        failedAt: attemptedAt,
        nextAttemptAt: attemptedAt,
        lastError: "redis down",
      }),
    );
  });
});
