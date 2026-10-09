import { Injectable } from "@nestjs/common";
import { EventOutboxRepository } from "../event-outbox.repository";
import { ContextLogger } from "../../../shared/logging/context-logger";
import { RequestContextService } from "../../../shared/context/request-context.service";
import { throwNotFound } from "../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../shared/constants/error-codes";

export interface ReplayDeadLetterInput {
  id: string;
  actorUserId?: string | null;
}

export interface ReplayDeadLetterResult {
  replayed: true;
  id: string;
  eventType: string;
}

@Injectable()
export class ReplayDeadLetterUseCase {
  private readonly logger: ContextLogger;

  constructor(
    private readonly outboxRepo: EventOutboxRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(requestContext, ReplayDeadLetterUseCase.name);
  }

  async execute(input: ReplayDeadLetterInput): Promise<ReplayDeadLetterResult> {
    const actorUserId =
      input.actorUserId ?? this.requestContext.get()?.userId ?? null;

    const existing = await this.outboxRepo.findDeadLetterById(input.id);
    if (!existing) {
      this.logger.warn({
        msg: "event_dlq_replay_not_found",
        outboxId: input.id,
      });
      throwNotFound("Dead letter event not found", ERROR_CODES.NOT_FOUND, {
        id: input.id,
        reason: "DEAD_LETTER_NOT_FOUND",
      });
    }

    const replayed = await this.outboxRepo.replayDeadLetter(
      input.id,
      actorUserId,
    );

    this.logger.log({
      msg: "event_dlq_replayed",
      outboxId: input.id,
      eventType: existing.eventType,
      actorUserId,
    });

    return {
      replayed: true,
      id: input.id,
      eventType: replayed?.eventType ?? existing.eventType,
    };
  }
}
