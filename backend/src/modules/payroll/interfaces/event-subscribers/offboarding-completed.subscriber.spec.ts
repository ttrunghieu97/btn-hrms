import { PayrollOffboardingCompletedSubscriber } from "./offboarding-completed.subscriber";

const OFFBOARDING_COMPLETED_EVENT_TYPE = "offboarding.completed.v1";

describe("PayrollOffboardingCompletedSubscriber", () => {
  let idempotencyTable: { consumerId: string; eventId: string }[];
  let eventBus: any;

  function makeEventBus() {
    const handlers: Record<string, Function[]> = {};
    return {
      on: jest.fn((eventType: string, handler: Function) => {
        (handlers[eventType] ??= []).push(handler);
      }),
      _emit: async (eventType: string, event: any) => {
        for (const h of handlers[eventType] ?? []) await h(event);
      },
    };
  }

  function makeIdempotency() {
    return {
      isProcessed: jest.fn((consumerId: string, eventId: string) =>
        Promise.resolve(
          idempotencyTable.some(
            (r) => r.consumerId === consumerId && r.eventId === eventId,
          ),
        ),
      ),
      markProcessed: jest.fn((consumerId: string, eventId: string) => {
        idempotencyTable.push({ consumerId, eventId });
        return Promise.resolve();
      }),
    };
  }

  const requestContext = {
    get: jest.fn().mockReturnValue({ requestId: "rid", userId: "u" }),
  };

  function makeEvent(overrides: Partial<{ eventId: string; processId: string; employeeId: string }> = {}) {
    return {
      eventId: overrides.eventId ?? "evt-1",
      data: {
        processId: overrides.processId ?? "proc-1",
        employeeId: overrides.employeeId ?? "emp-1",
      },
    };
  }

  beforeEach(() => {
    idempotencyTable = [];
    eventBus = makeEventBus();
  });

  it("subscribes to offboarding.completed.v1 and delegates to the settlement use-case", async () => {
    const idempotency = makeIdempotency();
    const calculate = {
      execute: jest
        .fn()
        .mockResolvedValue({ status: "settled", payrollRef: "payslip-1" }),
    };

    const subscriber = new PayrollOffboardingCompletedSubscriber(
      eventBus,
      idempotency as any,
      calculate as any,
      requestContext as any,
    );
    subscriber.onModuleInit();

    expect(eventBus.on).toHaveBeenCalledWith(
      OFFBOARDING_COMPLETED_EVENT_TYPE,
      expect.any(Function),
    );

    await eventBus._emit(OFFBOARDING_COMPLETED_EVENT_TYPE, makeEvent());

    expect(calculate.execute).toHaveBeenCalledWith({
      processId: "proc-1",
      employeeId: "emp-1",
    });
    expect(idempotency.markProcessed).toHaveBeenCalledWith(
      "payroll:offboarding_completed",
      "evt-1",
    );
  });

  it("skips duplicate delivery (idempotent) without recomputing", async () => {
    const idempotency = makeIdempotency();
    idempotencyTable.push({
      consumerId: "payroll:offboarding_completed",
      eventId: "dup",
    });
    const calculate = { execute: jest.fn() };

    const subscriber = new PayrollOffboardingCompletedSubscriber(
      eventBus,
      idempotency as any,
      calculate as any,
      requestContext as any,
    );
    subscriber.onModuleInit();

    await eventBus._emit(
      OFFBOARDING_COMPLETED_EVENT_TYPE,
      makeEvent({ eventId: "dup" }),
    );

    expect(calculate.execute).not.toHaveBeenCalled();
    expect(idempotency.markProcessed).not.toHaveBeenCalled();
  });

  it("does not mark processed when the use-case throws, so redelivery can retry", async () => {
    const idempotency = makeIdempotency();
    const calculate = {
      execute: jest.fn().mockRejectedValue(new Error("boom")),
    };

    const subscriber = new PayrollOffboardingCompletedSubscriber(
      eventBus,
      idempotency as any,
      calculate as any,
      requestContext as any,
    );
    subscriber.onModuleInit();

    await eventBus._emit(OFFBOARDING_COMPLETED_EVENT_TYPE, makeEvent());

    expect(calculate.execute).toHaveBeenCalled();
    expect(idempotency.markProcessed).not.toHaveBeenCalled();
  });
});
