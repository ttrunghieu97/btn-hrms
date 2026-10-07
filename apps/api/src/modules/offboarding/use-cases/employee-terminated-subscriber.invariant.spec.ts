/**
 * Employee Terminated → Offboarding Bridge Invariant.
 *
 * Validates that OffboardingEmployeeTerminatedSubscriber correctly:
 *   1. Listens to EmployeeTerminatedEvent
 *   2. Delegates to StartOffboardingUseCase
 *   3. Is idempotent per eventId
 *   4. Does NOT throw (catches errors gracefully — offboarding is async side-effect)
 */

import { OffboardingEmployeeTerminatedSubscriber } from "../subscribers/employee-terminated.subscriber";

const EMPLOYEE_TERMINATED_EVENT_TYPE = "workforce.employee.terminated.v1";

describe("OffboardingEmployeeTerminatedSubscriber", () => {
  let idempotencyTable: { consumerId: string; eventId: string }[];
  let eventBus: any;

  function makeEventBus() {
    const handlers: Record<string, Function[]> = {};
    return {
      on: jest.fn((eventType: string, handler: Function) => {
        (handlers[eventType] ??= []).push(handler);
      }),
      emit: async (eventType: string, event: any) => {
        for (const h of handlers[eventType] ?? []) await h(event);
      },
    };
  }

  function makeIdempotency() {
    return {
      isProcessed: jest.fn((consumerId: string, eventId: string) =>
        Promise.resolve(
          idempotencyTable.some((r) => r.consumerId === consumerId && r.eventId === eventId),
        ),
      ),
      markProcessed: jest.fn((consumerId: string, eventId: string) => {
        idempotencyTable.push({ consumerId, eventId });
        return Promise.resolve();
      }),
    };
  }

  function makeEvent(overrides: Partial<{ eventId: string; employeeId: string }> = {}) {
    return {
      eventId: overrides.eventId ?? "evt-1",
      data: { employeeId: overrides.employeeId ?? "emp-1" },
    };
  }

  beforeEach(() => {
    idempotencyTable = [];
    eventBus = makeEventBus();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("subscribes to EmployeeTerminatedEvent and starts offboarding", async () => {
    const idempotency = makeIdempotency();
    const startOffboarding = {
      execute: jest.fn().mockResolvedValue({ processId: "proc-1", status: "pending" }),
    };
    const requestContext = {
      get: jest.fn().mockReturnValue({ requestId: "rid", userId: "u" }),
    };

    const subscriber = new OffboardingEmployeeTerminatedSubscriber(
      eventBus, idempotency as any, startOffboarding as any, requestContext as any,
    );
    subscriber.onModuleInit();

    expect(eventBus.on).toHaveBeenCalledWith(
      EMPLOYEE_TERMINATED_EVENT_TYPE,
      expect.any(Function),
    );

    await eventBus.emit(EMPLOYEE_TERMINATED_EVENT_TYPE, makeEvent());

    expect(startOffboarding.execute).toHaveBeenCalledWith("emp-1");
    expect(idempotency.markProcessed).toHaveBeenCalledWith(
      "offboarding:employee_terminated",
      "evt-1",
    );
  });

  it("skips duplicate termination events (idempotent)", async () => {
    const idempotency = makeIdempotency();
    idempotencyTable.push({
      consumerId: "offboarding:employee_terminated",
      eventId: "dup",
    });
    const startOffboarding = { execute: jest.fn() };
    const requestContext = {
      get: jest.fn().mockReturnValue({ requestId: "rid", userId: "u" }),
    };

    const subscriber = new OffboardingEmployeeTerminatedSubscriber(
      eventBus, idempotency as any, startOffboarding as any, requestContext as any,
    );
    subscriber.onModuleInit();

    await eventBus.emit(EMPLOYEE_TERMINATED_EVENT_TYPE, makeEvent({ eventId: "dup" }));

    expect(startOffboarding.execute).not.toHaveBeenCalled();
    expect(idempotency.markProcessed).not.toHaveBeenCalled();
  });

  it("does not crash when startOffboarding returns null (no template)", async () => {
    const idempotency = makeIdempotency();
    const startOffboarding = { execute: jest.fn().mockResolvedValue(null) };
    const requestContext = {
      get: jest.fn().mockReturnValue({ requestId: "rid", userId: "u" }),
    };

    const subscriber = new OffboardingEmployeeTerminatedSubscriber(
      eventBus, idempotency as any, startOffboarding as any, requestContext as any,
    );
    subscriber.onModuleInit();

    await expect(
      eventBus.emit(EMPLOYEE_TERMINATED_EVENT_TYPE, makeEvent()),
    ).resolves.toBeUndefined();

    expect(idempotency.markProcessed).toHaveBeenCalled();
  });

  it("does not mark processed when use-case throws, allowing redelivery", async () => {
    const idempotency = makeIdempotency();
    const startOffboarding = {
      execute: jest.fn().mockRejectedValue(new Error("DB timeout")),
    };
    const requestContext = {
      get: jest.fn().mockReturnValue({ requestId: "rid", userId: "u" }),
    };

    const subscriber = new OffboardingEmployeeTerminatedSubscriber(
      eventBus, idempotency as any, startOffboarding as any, requestContext as any,
    );
    subscriber.onModuleInit();

    await eventBus.emit(EMPLOYEE_TERMINATED_EVENT_TYPE, makeEvent());

    expect(startOffboarding.execute).toHaveBeenCalled();
    expect(idempotency.markProcessed).not.toHaveBeenCalled();
  });
});
