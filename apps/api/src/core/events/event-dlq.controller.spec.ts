import { EventDlqController } from "./event-dlq.controller";
import { ListDeadLettersUseCase } from "./use-cases/list-dead-letters.usecase";
import { GetDeadLetterUseCase } from "./use-cases/get-dead-letter.usecase";
import { ReplayDeadLetterUseCase } from "./use-cases/replay-dead-letter.usecase";
import { ReplayAllDeadLettersUseCase } from "./use-cases/replay-all-dead-letters.usecase";
import { DiscardDeadLetterUseCase } from "./use-cases/discard-dead-letter.usecase";
import { EventOutboxRepository } from "./event-outbox.repository";
import { RequestContextService } from "../../shared/context/request-context.service";

describe("Event DLQ Use Cases & Controller", () => {
  let mockOutboxRepo: Partial<jest.Mocked<EventOutboxRepository>>;
  let mockRequestContext: Partial<RequestContextService>;
  let listUseCase: ListDeadLettersUseCase;
  let getUseCase: GetDeadLetterUseCase;
  let replayUseCase: ReplayDeadLetterUseCase;
  let replayAllUseCase: ReplayAllDeadLettersUseCase;
  let discardUseCase: DiscardDeadLetterUseCase;
  let controller: EventDlqController;

  const mockDeadLetterRow = {
    id: "dead-1",
    eventType: "TestEvent",
    eventVersion: 1,
    producerContext: "core",
    aggregateId: "agg-1",
    correlationId: "corr-1",
    causationId: null,
    payload: { foo: "bar" },
    occurredAt: new Date("2026-10-01T00:00:00Z"),
    publishedAt: null,
    attemptCount: 12,
    maxAttempts: 12,
    lastAttemptAt: new Date("2026-10-01T01:00:00Z"),
    nextAttemptAt: new Date("2026-10-01T01:00:00Z"),
    leaseUntil: null,
    failedAt: new Date("2026-10-01T01:00:00Z"),
    lastError: "permanent_failure: validation failed",
    createdAt: new Date("2026-10-01T00:00:00Z"),
  };

  beforeEach(() => {
    mockRequestContext = {
      get: jest.fn().mockReturnValue({ userId: "admin-user-1", requestId: "req-1" }),
    };

    mockOutboxRepo = {
      listDeadLetters: jest.fn().mockResolvedValue([mockDeadLetterRow as any]),
      countDeadLetters: jest.fn().mockResolvedValue(1),
      findDeadLetterById: jest.fn().mockImplementation((id: string) => {
        if (id === "dead-1") return Promise.resolve(mockDeadLetterRow as any);
        return Promise.resolve(null);
      }),
      replayDeadLetter: jest.fn().mockResolvedValue({
        ...mockDeadLetterRow,
        failedAt: null,
        attemptCount: 0,
      } as any),
      replayAllDeadLetters: jest.fn().mockResolvedValue(3),
      discardDeadLetter: jest.fn().mockResolvedValue(mockDeadLetterRow as any),
    };

    listUseCase = new ListDeadLettersUseCase(
      mockOutboxRepo as any,
      mockRequestContext as any,
    );
    getUseCase = new GetDeadLetterUseCase(
      mockOutboxRepo as any,
      mockRequestContext as any,
    );
    replayUseCase = new ReplayDeadLetterUseCase(
      mockOutboxRepo as any,
      mockRequestContext as any,
    );
    replayAllUseCase = new ReplayAllDeadLettersUseCase(
      mockOutboxRepo as any,
      mockRequestContext as any,
    );
    discardUseCase = new DiscardDeadLetterUseCase(
      mockOutboxRepo as any,
      mockRequestContext as any,
    );

    controller = new EventDlqController(
      listUseCase,
      getUseCase,
      replayUseCase,
      replayAllUseCase,
      discardUseCase,
    );
  });

  describe("List Dead Letters", () => {
    it("returns paginated list of dead letters", async () => {
      const result = await controller.list("10", "0");
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.items[0]!.id).toBe("dead-1");
      expect(result.items[0]!.eventType).toBe("TestEvent");
      expect(mockOutboxRepo.listDeadLetters).toHaveBeenCalledWith({ limit: 10, offset: 0 });
    });
  });

  describe("Inspect Dead Letter", () => {
    it("returns full details for an existing dead-letter event", async () => {
      const result = await controller.inspect("dead-1");
      expect(result.id).toBe("dead-1");
      expect(result.lastError).toContain("permanent_failure");
    });

    it("throws 404 when event is not found", async () => {
      await expect(controller.inspect("missing-id")).rejects.toThrow("Dead letter event not found");
    });
  });

  describe("Replay Dead Letter", () => {
    it("resets event for retry and passes actor user id", async () => {
      const result = await controller.replay("dead-1");
      expect(result.replayed).toBe(true);
      expect(result.id).toBe("dead-1");
      expect(mockOutboxRepo.replayDeadLetter).toHaveBeenCalledWith("dead-1", "admin-user-1");
    });

    it("throws 404 if dead letter does not exist", async () => {
      await expect(controller.replay("missing-id")).rejects.toThrow("Dead letter event not found");
    });
  });

  describe("Replay All Dead Letters", () => {
    it("replays all non-discarded dead letters and returns count", async () => {
      const result = await controller.replayAll();
      expect(result.replayed).toBe(true);
      expect(result.count).toBe(3);
      expect(mockOutboxRepo.replayAllDeadLetters).toHaveBeenCalledWith("admin-user-1");
    });
  });

  describe("Discard Dead Letter", () => {
    it("marks dead letter as discarded via POST", async () => {
      const result = await controller.discard("dead-1", { reason: "poison pill" });
      expect(result.discarded).toBe(true);
      expect(result.id).toBe("dead-1");
      expect(mockOutboxRepo.discardDeadLetter).toHaveBeenCalledWith(
        "dead-1",
        "poison pill",
        "admin-user-1",
        undefined,
      );
    });

    it("supports permanent deletion via DELETE", async () => {
      const result = await controller.delete("dead-1", "true");
      expect(result.discarded).toBe(true);
      expect(result.permanent).toBe(true);
      expect(mockOutboxRepo.discardDeadLetter).toHaveBeenCalledWith(
        "dead-1",
        undefined,
        "admin-user-1",
        true,
      );
    });
  });
});
