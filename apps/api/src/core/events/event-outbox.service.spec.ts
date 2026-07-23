import { EventOutboxService } from "./event-outbox.service";
import { registerEvent } from "../../shared/events/event-registry";

describe(EventOutboxService.name, () => {
  it("stages canonical event envelopes through the repository", async () => {
    const requestContext = {
      get: jest.fn().mockReturnValue({ requestId: "req-1" }),
    };
    const outboxRepo = {
      insert: jest.fn().mockResolvedValue({ id: "outbox-1" }),
    };
    const service = new EventOutboxService(
      requestContext as any,
      outboxRepo as any,
      { incrementOutboxEventsCreated: jest.fn() } as any,
      { current: jest.fn().mockReturnValue({ traceId: "t-1", spanId: "s-1" }) } as any,
    );

    class DemoEvent {
      constructor(public readonly employeeId: string, public readonly scopeId: string) {}
    }

    try {
      registerEvent({
        type: "DemoEvent",
        version: 1,
        requiredFields: ["employeeId", "scopeId"],
        strict: false,
      });
    } catch (e) {}

    await service.stage(new DemoEvent("emp-1", "company-1"));

    expect(outboxRepo.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "DemoEvent",
        scopeId: "company-1",
        aggregateId: "emp-1",
        correlationId: "req-1",
      }),
      undefined,
    );
  });
});
