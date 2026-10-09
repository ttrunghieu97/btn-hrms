import { Injectable } from "@nestjs/common";
import { EventOutboxRepository } from "../event-outbox.repository";
import { ContextLogger } from "../../../shared/logging/context-logger";
import { RequestContextService } from "../../../shared/context/request-context.service";

export interface ListDeadLettersInput {
  limit?: number;
  offset?: number;
}

export interface DeadLetterListItem {
  id: string;
  eventType: string;
  eventVersion: number;
  producerContext: string;
  aggregateId: string | null;
  correlationId: string | null;
  lastError: string | null;
  attemptCount: number;
  maxAttempts: number;
  occurredAt: Date;
  createdAt: Date;
  failedAt: Date | null;
}

export interface ListDeadLettersResult {
  items: DeadLetterListItem[];
  total: number;
  limit: number;
  offset: number;
}

@Injectable()
export class ListDeadLettersUseCase {
  private readonly logger: ContextLogger;

  constructor(
    private readonly outboxRepo: EventOutboxRepository,
    requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(requestContext, ListDeadLettersUseCase.name);
  }

  async execute(input: ListDeadLettersInput = {}): Promise<ListDeadLettersResult> {
    const limit = Math.min(Math.max(1, input.limit ?? 50), 200);
    const offset = Math.max(0, input.offset ?? 0);

    const [rows, total] = await Promise.all([
      this.outboxRepo.listDeadLetters({ limit, offset }),
      this.outboxRepo.countDeadLetters(),
    ]);

    this.logger.log({
      msg: "event_dlq_listed",
      count: rows.length,
      total,
      limit,
      offset,
    });

    return {
      items: rows.map((r) => ({
        id: r.id,
        eventType: r.eventType,
        eventVersion: r.eventVersion,
        producerContext: r.producerContext,
        aggregateId: r.aggregateId,
        correlationId: r.correlationId,
        lastError: r.lastError,
        attemptCount: r.attemptCount,
        maxAttempts: r.maxAttempts,
        occurredAt: r.occurredAt,
        createdAt: r.createdAt,
        failedAt: r.failedAt,
      })),
      total,
      limit,
      offset,
    };
  }
}
