import { EventOutboxDispatcherService } from "./event-outbox-dispatcher.service";
import { EventOutboxRepository } from "./event-outbox.repository";

describe(EventOutboxDispatcherService.name, () => {
  it("records attempt and marks rows published on success", async () => {
    const outboxRepo = {
      claimUnpublished: jest.fn().mockResolvedValue([
        {
          id: "out-1",
          eventType: "DemoEvent",
          eventVersion: 1,
          producerContext: "core",
          tenantId: "tenant-1",
          aggregateId: "agg-1",
          correlationId: "req-1",
          causationId: null,
          occurredAt: new Date(),
          attemptCount: 0,
          maxAttempts: 12,
          payload: { employeeId: "emp-1" },
        },
      ]),
      recordAttempt: jest.fn().mockResolvedValue({ id: "out-1" }),
      recordFailure: jest.fn(),
      markPublished: jest.fn().mockResolvedValue({ id: "out-1" }),
      getUnpublishedSummary: jest.fn().mockResolvedValue({
        unpublishedCount: 0,
        oldestUnpublishedAgeMs: 0,
      }),
    };
    const eventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    };
    const metrics = {
      setOutboxPendingCount: jest.fn(),
      setOutboxOldestUnpublishedAge: jest.fn(),
      incrementOutboxDispatchFailure: jest.fn(),
    };

    const service = new EventOutboxDispatcherService(
      outboxRepo as any,
      eventBus as any,
      metrics as any,
      { get: jest.fn().mockReturnValue(undefined) } as any,
    );

    const processed = await service.dispatchOnce();

    expect(processed).toBe(1);
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "DemoEvent",
        payload: { employeeId: "emp-1" },
      }),
    );
    expect(outboxRepo.recordAttempt).toHaveBeenCalledWith(
      "out-1",
      expect.any(Date),
    );
    expect(outboxRepo.recordFailure).not.toHaveBeenCalled();
    expect(outboxRepo.markPublished).toHaveBeenCalledWith("out-1");
    expect(metrics.setOutboxPendingCount).toHaveBeenCalledWith(0);
    expect(metrics.setOutboxOldestUnpublishedAge).toHaveBeenCalledWith(0);
  });

  it("records failure bookkeeping and leaves rows unpublished on publish failure", async () => {
    const outboxRepo = {
      claimUnpublished: jest.fn().mockResolvedValue([
        {
          id: "out-1",
          eventType: "DemoEvent",
          eventVersion: 1,
          producerContext: "core",
          tenantId: "tenant-1",
          aggregateId: "agg-1",
          correlationId: "req-1",
          causationId: null,
          occurredAt: new Date(),
          attemptCount: 0,
          maxAttempts: 12,
          payload: { employeeId: "emp-1" },
        },
      ]),
      recordAttempt: jest.fn(),
      recordFailure: jest.fn().mockResolvedValue({ id: "out-1" }),
      markPublished: jest.fn(),
      getUnpublishedSummary: jest.fn().mockResolvedValue({
        unpublishedCount: 1,
        oldestUnpublishedAgeMs: 1000,
      }),
    };
    const eventBus = {
      publish: jest.fn().mockRejectedValue(new Error("redis down")),
    };
    const metrics = {
      setOutboxPendingCount: jest.fn(),
      setOutboxOldestUnpublishedAge: jest.fn(),
      incrementOutboxDispatchFailure: jest.fn(),
    };

    const service = new EventOutboxDispatcherService(
      outboxRepo as any,
      eventBus as any,
      metrics as any,
      { get: jest.fn().mockReturnValue(undefined) } as any,
    );

    const processed = await service.dispatchOnce();

    expect(processed).toBe(1);
    expect(eventBus.publish).toHaveBeenCalled();
    expect(outboxRepo.recordAttempt).not.toHaveBeenCalled();
    expect(outboxRepo.recordFailure).toHaveBeenCalledWith(
      "out-1",
      "redis down",
      expect.any(Date),
      1,
      12,
    );
    expect(outboxRepo.markPublished).not.toHaveBeenCalled();
    expect(metrics.incrementOutboxDispatchFailure).toHaveBeenCalled();
    expect(metrics.setOutboxPendingCount).toHaveBeenCalledWith(1);
    expect(metrics.setOutboxOldestUnpublishedAge).toHaveBeenCalledWith(1000);
  });

  it("publishes metadata mapped from raw PostgreSQL outbox rows", async () => {
    const db = {
      execute: jest.fn().mockResolvedValue({
        rows: [
          {
            id: "out-1",
            event_type: "EmployeeUpdated",
            event_version: 2,
            producer_context: "workforce",
            aggregate_id: "11111111-1111-1111-1111-111111111111",
            correlation_id: "req-1",
            causation_id: null,
            payload: { employeeId: "emp-1" },
            occurred_at: new Date("2026-06-10T00:00:00.000Z"),
            published_at: null,
            attempt_count: 0,
            max_attempts: 12,
            last_attempt_at: null,
            next_attempt_at: new Date("2026-06-10T00:00:00.000Z"),
            lease_until: new Date("2026-06-10T00:00:30.000Z"),
            failed_at: null,
            last_error: null,
            created_at: new Date("2026-06-10T00:00:00.000Z"),
          },
        ],
      }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ id: "out-1" }]),
          }),
        }),
      }),
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([
            { count: 0, oldestCreatedAt: null },
          ]),
        }),
      }),
    };
    const outboxRepo = new EventOutboxRepository(db as any);
    const eventBus = { publish: jest.fn().mockResolvedValue(undefined) };
    const metrics = {
      setOutboxPendingCount: jest.fn(),
      setOutboxOldestUnpublishedAge: jest.fn(),
      incrementOutboxDispatchFailure: jest.fn(),
    };
    const service = new EventOutboxDispatcherService(
      outboxRepo,
      eventBus as any,
      metrics as any,
      { get: jest.fn() } as any,
    );

    await service.dispatchOnce();

    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: "out-1",
        eventType: "EmployeeUpdated",
        eventVersion: 2,
        producerContext: "workforce",
        aggregateId: "11111111-1111-1111-1111-111111111111",
        correlationId: "req-1",
        payload: { employeeId: "emp-1" },
      }),
    );
  });
});
