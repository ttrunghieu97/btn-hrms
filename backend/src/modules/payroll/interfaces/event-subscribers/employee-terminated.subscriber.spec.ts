import { PayrollEmployeeTerminatedSubscriber } from "./employee-terminated.subscriber";
import { EmployeeTerminatedEvent } from "../../../../core/events/events/employee-terminated.event";
import { EmployeeRehiredEvent } from "../../../../core/events/events/employee-rehired.event";

describe("PayrollEmployeeTerminatedSubscriber", () => {
  let idempotencyTable: { consumerId: string; eventId: string }[];
  let payrollTable: Record<string, any>[];
  let mockDb: any;
  let mockPayrollRepo: any;
  let subscriber: PayrollEmployeeTerminatedSubscriber;
  let eventBus: any;

  function makeEventBus() {
    const handlers: Record<string, Function[]> = {};
    return {
      on: jest.fn((eventType: string, handler: Function) => {
        if (!handlers[eventType]) handlers[eventType] = [];
        handlers[eventType].push(handler);
      }),
      _handlers: handlers,
      _emit: async (eventType: string, event: any) => {
        for (const h of handlers[eventType] ?? []) await h(event);
      },
    };
  }

  beforeEach(() => {
    idempotencyTable = [];
    payrollTable = [];

    mockDb = {
      query: {
        consumerIdempotency: {
          findFirst: jest.fn().mockImplementation((args: any) => {
            const where = args.where;
            const result = idempotencyTable.find(
              (r) =>
                r.consumerId === where?.[2]?.consumerId?._value &&
                r.eventId === where?.[2]?.eventId?._value,
            );
            return Promise.resolve(result ?? null);
          }),
        },
      },
      transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockDb)),
      insert: jest.fn().mockImplementation((table: any) => ({
        values: jest.fn().mockImplementation((v: any) => {
          idempotencyTable.push(v);
          return {};
        }),
      })),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      }),
    };

    mockPayrollRepo = {};
    eventBus = makeEventBus();

    const mockRequestContext = { get: jest.fn().mockReturnValue({ requestId: "test-rid", userId: "test-user" }) };

    const mockIdempotency = {
      isProcessed: jest.fn().mockImplementation((consumerId: string, eventId: string) => {
        const exists = idempotencyTable.some(
          (r) => r.consumerId === consumerId && r.eventId === eventId,
        );
        return Promise.resolve(exists);
      }),
      markProcessed: jest.fn().mockImplementation((consumerId: string, eventId: string) => {
        idempotencyTable.push({ consumerId, eventId });
        return Promise.resolve();
      }),
    };

    subscriber = new PayrollEmployeeTerminatedSubscriber(
      eventBus,
      mockIdempotency as any,
      mockRequestContext as any,
    );
    subscriber.onModuleInit();
  });

  it("logs termination and records idempotency for terminated employee", async () => {
    const event = new EmployeeTerminatedEvent({
      employeeId: "e1", terminatedByUserId: "u1", effectiveDate: "2026-07-15", reason: "resigned",
    });
    await eventBus._emit(EmployeeTerminatedEvent.eventType, event);
    expect(idempotencyTable.length).toBeGreaterThan(0);
  });

  it("skips processing on duplicate delivery (idempotent)", async () => {
    idempotencyTable.push({ consumerId: "payroll:employee_terminated", eventId: "dup-event" });
    const event = new EmployeeTerminatedEvent({
      employeeId: "e1", terminatedByUserId: null, effectiveDate: "2026-01-01", reason: "",
    });
    (event as any).eventId = "dup-event";
    await eventBus._emit(EmployeeTerminatedEvent.eventType, event);
    // Assert that markProcessed was not called for duplicate delivery
    const mockIdempotencyInstance = (subscriber as any).idempotency;
    expect(mockIdempotencyInstance.markProcessed).not.toHaveBeenCalled();
  });

  it("logs rehire and records idempotency for rehired employee", async () => {
    const event = new EmployeeRehiredEvent({
      employeeId: "e1", rehiredByUserId: null, hireDate: "2026-08-01", status: "working", newEmploymentRecordId: "er-2",
    });
    await eventBus._emit(EmployeeRehiredEvent.eventType, event);
    expect(idempotencyTable.length).toBeGreaterThan(0);
  });
});
