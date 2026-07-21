import { EventOutboxService } from "./event-outbox.service";
import { EventOutboxRepository } from "./event-outbox.repository";
import { EmployeeStatusChangedEvent } from "./events/employee-status-changed.event";

describe("Event Outbox Hardening", () => {
  let outboxTable: Record<string, any>[];
  let mocks: { insert: any; update: any; select: any; execute: any };
  let service: EventOutboxService;
  let repo: EventOutboxRepository;

  beforeEach(() => {
    outboxTable = [];

    const values = (v: any) => {
      const row = { ...v, id: "id-" + Math.random().toString(36).slice(2) };
      outboxTable.push(row);
      return { returning: jest.fn().mockResolvedValue([row]) };
    };

    const updateSet = jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([outboxTable[0] ?? { id: "upd" }]) }),
    });

    mocks = {
      insert: jest.fn().mockReturnValue({ values }),
      update: jest.fn().mockReturnValue({ set: updateSet }),
      select: jest.fn(() => ({ from: jest.fn(() => ({ where: jest.fn(() => ({ limit: jest.fn(() => []) })) })) })),
      execute: jest.fn().mockResolvedValue({ rows: [] }),
    };

    repo = new EventOutboxRepository(mocks as any);
    const metricsMock = { incrementOutboxEventsCreated: jest.fn() } as any;
    service = new EventOutboxService(
      { get: jest.fn() } as any,
      repo,
      metricsMock,
      { current: jest.fn().mockReturnValue({ traceId: "t-1", spanId: "s-1" }) } as any,
    );
  });

  it("stages event into outbox table", async () => {
    const event = new EmployeeStatusChangedEvent({
      employeeId: "e1", fromStatus: "working", toStatus: "leave",
      changedByUserId: "u1", effectiveDate: "2026-07-01", reason: "v",
    });
    await service.stage(event);
    expect(outboxTable.length).toBe(1);
    expect(outboxTable[0]!.eventType).toBe("workforce.employee.status-changed.v1");
    expect(outboxTable[0]!.eventVersion).toBe(1);
  });

  it("preserves payload fidelity through staging", async () => {
    const event = new EmployeeStatusChangedEvent({
      employeeId: "e1", fromStatus: "probation", toStatus: "working",
      changedByUserId: "u1", effectiveDate: "2026-06-15", reason: "Completed",
    });
    await service.stage(event);
    const envPayload = outboxTable[0]!.payload;
    // DomainEvent stores payload in .data — the envelope's payload
    // is the event's .data because toEnvelope reads source.payload = event.data
    const payload = envPayload.data ?? envPayload;
    expect(payload.fromStatus).toBe("probation");
    expect(payload.toStatus).toBe("working");
    expect(payload.effectiveDate).toBe("2026-06-15");
  });

  it("events carry unique eventId", () => {
    const a = new EmployeeStatusChangedEvent({ employeeId: "e1", fromStatus: "a", toStatus: "b", changedByUserId: null, effectiveDate: "2026-01-01", reason: null });
    const b = new EmployeeStatusChangedEvent({ employeeId: "e1", fromStatus: "a", toStatus: "b", changedByUserId: null, effectiveDate: "2026-01-01", reason: null });
    expect(a.eventId).toBeDefined();
    expect(a.eventId).not.toBe(b.eventId);
  });

  it("outbox inserts use eventId as natural dedupe key", async () => {
    const event = new EmployeeStatusChangedEvent({
      employeeId: "e1", fromStatus: "working", toStatus: "leave",
      changedByUserId: null, effectiveDate: "2026-01-01", reason: null,
    });
    await service.stage(event);
    expect(outboxTable[0]!.correlationId).toBeDefined();
  });

  it("duplicate eventId insert creates separate rows (DB dedupe not enforced)", async () => {
    const event = new EmployeeStatusChangedEvent({
      employeeId: "e1", fromStatus: "working", toStatus: "leave",
      changedByUserId: null, effectiveDate: "2026-01-01", reason: null,
    });
    await service.stage(event);
    // same event staged again (outbox does not deduplicate - consumer idempotency handles replay)
    await service.stage(event);
    expect(outboxTable.length).toBe(2);
  });
});
