import { EventIdempotencyRepository } from "../../infrastructure/repositories/event-idempotency.repository";
import { DomainEventsWorkflowHandler } from "../../modules/platform-workflow-engine/handlers/domain-events-workflow.handler";
import { AttendanceCheckedHandler } from "./handlers/attendance-checked.handler";
import { LeaveRequestedEvent } from "./events/leave-requested.event";

describe("Consumer Idempotency & Delivery Invariant", () => {
  let inMemoryIdempotencyStore: Set<string>;
  let mockDb: any;
  let idempotencyRepo: EventIdempotencyRepository;

  beforeEach(() => {
    inMemoryIdempotencyStore = new Set<string>();

    mockDb = {
      query: {
        consumerIdempotency: {
          findFirst: jest.fn().mockImplementation(({ where }) => {
            // Simulated check based on what is in store
            return Promise.resolve(null);
          }),
        },
      },
      insert: jest.fn().mockImplementation(() => ({
        values: jest.fn().mockImplementation((val) => {
          const key = `${val.consumerId}:${val.eventId}`;
          if (inMemoryIdempotencyStore.has(key)) {
            const err: any = new Error("duplicate key value violates unique constraint");
            err.code = "23505";
            throw err;
          }
          inMemoryIdempotencyStore.add(key);
          return Promise.resolve();
        }),
      })),
      transaction: jest.fn().mockImplementation(async (callback) => {
        const tx = {
          query: {
            consumerIdempotency: {
              findFirst: jest.fn().mockImplementation(() => {
                return Promise.resolve(null);
              }),
            },
          },
          insert: mockDb.insert,
        };
        return callback(tx);
      }),
    };

    idempotencyRepo = new EventIdempotencyRepository(mockDb);

    // Wire isProcessed to the inMemoryIdempotencyStore
    jest.spyOn(idempotencyRepo, "isProcessed").mockImplementation(async (consumerId, eventId) => {
      return inMemoryIdempotencyStore.has(`${consumerId}:${eventId}`);
    });
  });

  describe("EventIdempotencyRepository.runIdempotent", () => {
    it("executes operation on first delivery and marks processed", async () => {
      let sideEffectCount = 0;
      const result = await idempotencyRepo.runIdempotent(
        "consumer-test",
        "event-uuid-1",
        async () => {
          sideEffectCount++;
          return "success-result";
        },
      );

      expect(result.executed).toBe(true);
      expect(result.result).toBe("success-result");
      expect(sideEffectCount).toBe(1);
      expect(inMemoryIdempotencyStore.has("consumer-test:event-uuid-1")).toBe(true);
    });

    it("proves invariant: redelivery/replay of same event produces zero duplicate side effects", async () => {
      let sideEffectCount = 0;
      const operation = async () => {
        sideEffectCount++;
        return { data: "processed" };
      };

      // 1st delivery
      const firstDelivery = await idempotencyRepo.runIdempotent(
        "payroll-consumer",
        "event-duplicate-1",
        operation,
      );
      expect(firstDelivery.executed).toBe(true);
      expect(sideEffectCount).toBe(1);

      // 2nd delivery (redelivery / replay from DLQ or outbox retry)
      const secondDelivery = await idempotencyRepo.runIdempotent(
        "payroll-consumer",
        "event-duplicate-1",
        operation,
      );
      expect(secondDelivery.executed).toBe(false);
      expect(sideEffectCount).toBe(1); // Unchanged! Zero duplicate side effects

      // 3rd delivery (replayed again)
      const thirdDelivery = await idempotencyRepo.runIdempotent(
        "payroll-consumer",
        "event-duplicate-1",
        operation,
      );
      expect(thirdDelivery.executed).toBe(false);
      expect(sideEffectCount).toBe(1); // Still 1!
    });

    it("does not mark processed when operation fails, allowing future retries", async () => {
      let attempts = 0;
      const failingOperation = async () => {
        attempts++;
        if (attempts === 1) {
          throw new Error("transient DB failure");
        }
        return "recovered";
      };

      // 1st attempt fails
      await expect(
        idempotencyRepo.runIdempotent(
          "consumer-retry",
          "event-fail-1",
          failingOperation,
        ),
      ).rejects.toThrow("transient DB failure");

      expect(attempts).toBe(1);
      expect(inMemoryIdempotencyStore.has("consumer-retry:event-fail-1")).toBe(false);

      // 2nd attempt succeeds (retry works because not marked processed)
      const secondAttempt = await idempotencyRepo.runIdempotent(
        "consumer-retry",
        "event-fail-1",
        failingOperation,
      );

      expect(secondAttempt.executed).toBe(true);
      expect(secondAttempt.result).toBe("recovered");
      expect(attempts).toBe(2);
      expect(inMemoryIdempotencyStore.has("consumer-retry:event-fail-1")).toBe(true);
    });
  });

  describe("DomainEventsWorkflowHandler Idempotency Invariant", () => {
    it("does not trigger duplicate workflows when LeaveRequestedEvent is replayed", async () => {
      const eventHandlers = new Map<string, (e: any) => Promise<void>>();
      const mockEventBus = {
        on: jest.fn().mockImplementation((name, handler) => {
          eventHandlers.set(name, handler);
        }),
      };
      const mockWorkflows = {
        startWorkflow: jest.fn().mockResolvedValue({ id: "wf-1", currentState: "pending" }),
      };

      const handler = new DomainEventsWorkflowHandler(
        mockEventBus as any,
        mockWorkflows as any,
        idempotencyRepo,
      );
      handler.onModuleInit();
      const leaveListener = eventHandlers.get(LeaveRequestedEvent.eventType);
      expect(leaveListener).toBeDefined();

      const eventPayload = {
        eventId: "event-leave-100",
        data: {
          leaveRequestId: "req-1",
          employeeId: "emp-1",
          userId: "user-1",
          approverUserId: "mgr-1",
        },
      };

      // First delivery: startWorkflow is called
      await leaveListener!(eventPayload);
      expect(mockWorkflows.startWorkflow).toHaveBeenCalledTimes(1);

      // Second delivery (replay / retry): startWorkflow must NOT be called again
      await leaveListener!(eventPayload);
      expect(mockWorkflows.startWorkflow).toHaveBeenCalledTimes(1);
    });
  });

  describe("AttendanceCheckedHandler Idempotency Invariant", () => {
    it("does not log or process duplicate attendance events on redelivery", async () => {
      const eventHandlers = new Map<string, (e: any) => Promise<void>>();
      const mockEventBus = {
        on: jest.fn().mockImplementation((name, handler) => {
          eventHandlers.set(name, handler);
        }),
      };
      const mockRequestContext = { get: jest.fn() };

      const handler = new AttendanceCheckedHandler(
        mockEventBus as any,
        mockRequestContext as any,
        idempotencyRepo,
      );
      handler.onModuleInit();

      const listener = eventHandlers.get("AttendanceCheckedEvent");
      expect(listener).toBeDefined();

      const eventPayload = {
        eventId: "att-event-1",
        employeeId: "emp-1",
        type: "check-in",
        date: "2026-10-08",
      };

      // Spying on logger or execution
      let processed = false;
      jest.spyOn(idempotencyRepo, "runIdempotent").mockImplementation(async (c, id, op) => {
        if (inMemoryIdempotencyStore.has(`${c}:${id}`)) return { executed: false };
        await op();
        inMemoryIdempotencyStore.add(`${c}:${id}`);
        processed = true;
        return { executed: true };
      });

      await listener!(eventPayload);
      expect(processed).toBe(true);

      processed = false;
      // Redelivery
      await listener!(eventPayload);
      expect(processed).toBe(false); // skipped on redelivery
    });
  });
});
