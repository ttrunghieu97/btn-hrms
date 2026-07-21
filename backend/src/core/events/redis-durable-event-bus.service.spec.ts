import { type ConfigService } from "@nestjs/config";
import { RedisDurableEventBus } from "./redis-durable-event-bus.service";

describe("RedisDurableEventBus", () => {
  const makeService = (overrides?: Record<string, string | undefined>) => {
    const redis = {
      xadd: jest.fn(),
      xgroup: jest.fn(),
      xreadgroup: jest.fn(),
      xack: jest.fn(),
      xpending: jest.fn(),
      xclaim: jest.fn(),
    } as any;
    const redisService = {
        getClientOrNull: () => redis,
      getClient: () => redis,
    } as any;
    const config = {
      get: (key: string) => {
        if (key === "EVENT_BUS_STREAM_KEY") return "hrms:test:events";
        if (key === "EVENT_BUS_CONSUMER_GROUP") return "hrms-test";
        if (overrides && key in overrides) return overrides[key];
        return undefined;
      },
    } as ConfigService;
    const metrics = {
      incrementEventBusPublished: jest.fn(),
      incrementEventBusProcessed: jest.fn(),
      incrementEventBusFailed: jest.fn(),
      setEventBusPendingCount: jest.fn(),
      incrementEventBusRetried: jest.fn(),
      incrementEventBusDlq: jest.fn(),
      incrementContractValidationFailed: jest.fn(),
    } as any;
    const requestContext = {
      get: () => null,
    } as any;
    const db = {
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockResolvedValue(undefined),
      }),
    } as any;
    const service = new RedisDurableEventBus(
      redisService,
      config,
      requestContext,
      db,
      metrics,
    );
    return { service, redis, metrics, db };
  };

  it("publishes event envelope to Redis stream", async () => {
    class DemoEvent {
      constructor(public readonly value: string) {}
    }

    const { service, redis, metrics } = makeService();
    redis.xadd.mockResolvedValue("1-0");

    await service.publish(new DemoEvent("ok"));

    expect(redis.xadd).toHaveBeenCalledTimes(1);
    const args = redis.xadd.mock.calls[0];
    expect(args[0]).toBe("hrms:test:events");
    expect(args[1]).toBe("*");
    expect(args[2]).toBe("data");
    const envelope = JSON.parse(args[3]);
    expect(envelope.eventType).toBe("DemoEvent");
    expect(envelope.payload).toEqual({ value: "ok" });
    expect(envelope.eventVersion).toBe(1);
    expect(envelope.producerContext).toBe("core");
    expect(metrics.incrementEventBusPublished).toHaveBeenCalledTimes(1);
  });

  it("publishes stream entries with approximate maxlen when EVENT_BUS_STREAM_MAXLEN is configured", async () => {
    const { service, redis } = makeService({ EVENT_BUS_STREAM_MAXLEN: "1000" });

    redis.xadd.mockResolvedValue("1-0");

    await service.publish({ eventType: "TaskCreated", payload: { id: "task-1" } });

    expect(redis.xadd).toHaveBeenCalledWith(
      "hrms:test:events",
      "MAXLEN",
      "~",
      "1000",
      "*",
      "data",
      expect.any(String),
    );
  });

  it("fails publish explicitly when Redis publish fails", async () => {
    class DemoEvent {
      constructor(public readonly value: string) {}
    }

    const { service, redis, metrics } = makeService();
    const handler = jest.fn(async () => undefined);
    service.on("DemoEvent", handler);
    redis.xadd.mockRejectedValue(new Error("redis down"));

    await expect(service.publish(new DemoEvent("fallback"))).rejects.toThrow(
      "redis down",
    );

    expect(handler).not.toHaveBeenCalled();
    expect(metrics.incrementEventBusFailed).toHaveBeenCalledTimes(1);
  });

  it("consumes stream entries and ACKs successful handlers", async () => {
    const { service, redis, metrics } = makeService();
    const handler = jest.fn(async () => undefined);
    service.on("EmployeeCreatedEvent", handler);

    const eventData = JSON.stringify({
      eventType: "EmployeeCreatedEvent",
      eventId: "evt-1",
      eventVersion: 1,
      producerContext: "core",
      aggregateId: null,
      payload: { employeeId: "emp-1" },
      correlationId: null,
      causationId: null,
      occurredAt: new Date().toISOString(),
    });

    redis.xpending.mockResolvedValue([]);
    redis.xreadgroup
      .mockResolvedValueOnce([
        ["hrms:test:events", [["1-0", ["data", eventData]]]],
      ])
      .mockImplementationOnce(async () => {
        (service as any).running = false;
        return null;
      });

    redis.xack.mockResolvedValue(1);
    (service as any).running = true;

    await (service as any).consumeLoop();

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: "emp-1" }),
    );
    expect(redis.xack).toHaveBeenCalledWith(
      "hrms:test:events",
      "hrms-test",
      "1-0",
    );
    expect(metrics.incrementEventBusProcessed).toHaveBeenCalledTimes(1);
  });

  it("does not ACK failed handlers to keep message pending", async () => {
    const { service, redis, metrics } = makeService();
    const handler = jest.fn(async () => {
      throw new Error("handler failed");
    });
    service.on("PayrollGeneratedEvent", handler);

    const eventData = JSON.stringify({
      eventType: "PayrollGeneratedEvent",
      eventId: "evt-2",
      eventVersion: 1,
      producerContext: "core",
      aggregateId: null,
      payload: { payrollId: "pay-1" },
      correlationId: null,
      causationId: null,
      occurredAt: new Date().toISOString(),
    });

    redis.xpending.mockResolvedValue([]);
    redis.xreadgroup
      .mockResolvedValueOnce([
        ["hrms:test:events", [["2-0", ["data", eventData]]]],
      ])
      .mockImplementationOnce(async () => {
        (service as any).running = false;
        return null;
      });

    (service as any).running = true;
    await (service as any).consumeLoop();

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ payrollId: "pay-1" }),
    );
    expect(redis.xack).not.toHaveBeenCalled();
    expect(metrics.incrementEventBusFailed).toHaveBeenCalledTimes(1);
  });

  it("reclaims stale pending events and processes them", async () => {
    const { service, redis } = makeService({
      EVENT_BUS_RECLAIM_IDLE_MS: "1",
      EVENT_BUS_RECLAIM_COUNT: "10",
    });
    const handler = jest.fn(async () => undefined);
    service.on("AttendanceCheckedEvent", handler);

    const eventData = JSON.stringify({
      eventType: "AttendanceCheckedEvent",
      eventId: "evt-3",
      eventVersion: 1,
      producerContext: "core",
      aggregateId: null,
      payload: { attendanceId: "att-1" },
      correlationId: null,
      causationId: null,
      occurredAt: new Date().toISOString(),
    });

    redis.xpending.mockResolvedValueOnce([["3-0", "c1", 10, 2]]);
    redis.xclaim.mockResolvedValueOnce([["3-0", ["data", eventData]]]);
    redis.xreadgroup.mockImplementationOnce(async () => {
      (service as any).running = false;
      return null;
    });

    (service as any).running = true;
    await (service as any).consumeLoop();

    expect(redis.xclaim).toHaveBeenCalled();
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ attendanceId: "att-1" }),
    );
    expect(redis.xack).toHaveBeenCalledWith(
      "hrms:test:events",
      "hrms-test",
      "3-0",
    );
  });

  it("moves message to DLQ when retry threshold is exceeded", async () => {
    const { service, redis } = makeService({
      EVENT_BUS_RECLAIM_IDLE_MS: "1",
      EVENT_BUS_MAX_RETRIES: "3",
    });
    const handler = jest.fn(async () => {
      throw new Error("still failing");
    });
    service.on("PayrollGeneratedEvent", handler);

    const eventData = JSON.stringify({
      eventType: "PayrollGeneratedEvent",
      eventId: "evt-5",
      eventVersion: 1,
      producerContext: "core",
      aggregateId: null,
      payload: { payrollId: "pay-2" },
      correlationId: null,
      causationId: null,
      occurredAt: new Date().toISOString(),
    });

    redis.xpending.mockResolvedValueOnce([["5-0", "c2", 20, 4]]);
    redis.xclaim.mockResolvedValueOnce([["5-0", ["data", eventData]]]);
    redis.xreadgroup.mockImplementationOnce(async () => {
      (service as any).running = false;
      return null;
    });

    (service as any).running = true;
    await (service as any).consumeLoop();

    expect(redis.xadd).toHaveBeenCalledWith(
      "hrms:test:events:dlq",
      "*",
      "data",
      eventData,
      "originalStream",
      "hrms:test:events",
      "originalId",
      "5-0",
      "attempts",
      "4",
      "failedAt",
      expect.any(String),
      "reason",
      "still failing",
    );
    expect(redis.xack).toHaveBeenCalledWith(
      "hrms:test:events",
      "hrms-test",
      "5-0",
    );
  });

  it("returns healthy status and pending count", async () => {
    const { service, redis, metrics } = makeService();
    redis.xpending.mockResolvedValue([3, "1-0", "3-0", []]);

    const result = await service.healthCheck();

    expect(result).toEqual({ ok: true, pending: 3 });
    expect(metrics.setEventBusPendingCount).toHaveBeenCalledWith(3);
  });

  it("returns unhealthy status when Redis pending check fails", async () => {
    const { service, redis, metrics } = makeService();
    redis.xpending.mockRejectedValue(new Error("redis unavailable"));

    const result = await service.healthCheck();

    expect(result.ok).toBe(false);
    expect(result.detail).toContain("redis unavailable");
    expect(metrics.setEventBusPendingCount).not.toHaveBeenCalled();
  });
});
