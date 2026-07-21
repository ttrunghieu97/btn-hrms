import { TaskEventPublisher } from "./task-event-publisher";

describe("TaskEventPublisher", () => {
  function makePublisher() {
    const eventStore = {
      append: jest.fn(),
      markProcessed: jest.fn(),
      markUnprocessed: jest.fn(),
      findUnprocessed: jest.fn(),
      transaction: jest.fn(async (fn: any) => fn({})),
    };
    const requestContext = {
      get: jest.fn().mockReturnValue({ requestId: "req-1", scopeId: "t-1" }),
    };
    const metrics = {
      incrementKafkaEventsPublished: jest.fn(),
      observeEventDispatchLag: jest.fn(),
    };
    const publisher = new TaskEventPublisher(
      eventStore as any,
      requestContext as any,
      metrics as any,
      null,
    );
    return { publisher, eventStore, requestContext, metrics };
  }

  it("marks event as processed when kafka publish succeeds", async () => {
    const { publisher, eventStore } = makePublisher();
    (publisher as any).producer = {
      send: jest.fn().mockResolvedValue(undefined),
    };

    await publisher.publish({
      eventType: "task.submitted",
      aggregateId: "task-1",
      actorUserId: "user-1",
      payload: { ok: true },
    });

    expect(eventStore.append).toHaveBeenCalledTimes(1);
    expect(eventStore.append).toHaveBeenCalledWith(
      expect.objectContaining({
        eventVersion: 1,
        producerContext: "tasks",
        scopeId: "t-1",
        correlationId: "req-1",
      }),
      undefined,
    );
    expect(eventStore.markProcessed).toHaveBeenCalledTimes(1);
    expect(eventStore.markUnprocessed).not.toHaveBeenCalled();
  });

  it("retries dispatch from unprocessed queue", async () => {
    const { publisher, eventStore } = makePublisher();
    eventStore.findUnprocessed.mockResolvedValue([
      {
        id: "evt-1",
        eventType: "task.overdue",
        aggregateId: "task-1",
        actorUserId: null,
        correlationId: null,
        causationId: null,
        occurredAt: new Date().toISOString(),
        scopeId: "t-1",
        payload: { taskId: "task-1" },
      },
    ]);
    (publisher as any).producer = {
      send: jest.fn().mockResolvedValue(undefined),
    };

    const count = await publisher.dispatchUnprocessed(100);
    expect(count).toBe(1);
    expect(eventStore.findUnprocessed).toHaveBeenCalledWith(
      100,
      expect.any(Object),
    );
    expect(eventStore.markProcessed).toHaveBeenCalledTimes(1);
  });
});
