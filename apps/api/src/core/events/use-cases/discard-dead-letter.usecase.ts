import { Injectable } from "@nestjs/common";
import { EventOutboxRepository } from "../event-outbox.repository";
import { ContextLogger } from "../../../shared/logging/context-logger";
import { RequestContextService } from "../../../shared/context/request-context.service";
import { throwNotFound } from "../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../shared/constants/error-codes";

export interface DiscardDeadLetterInput {
  id: string;
  reason?: string;
  permanent?: boolean;
  actorUserId?: string | null;
}

export interface DiscardDeadLetterResult {
  discarded: true;
  id: string;
  permanent: boolean;
}

@Injectable()
export class DiscardDeadLetterUseCase {
  private readonly logger: ContextLogger;

  constructor(
    private readonly outboxRepo: EventOutboxRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(
      requestContext,
      DiscardDeadLetterUseCase.name,
    );
  }

  async execute(input: DiscardDeadLetterInput): Promise<DiscardDeadLetterResult> {
    const actorUserId =
      input.actorUserId ?? this.requestContext.get()?.userId ?? null;

    const existing = await this.outboxRepo.findDeadLetterById(input.id);
    if (!existing) {
      this.logger.warn({
        msg: "event_dlq_discard_not_found",
        outboxId: input.id,
      });
      throwNotFound("Dead letter event not found", ERROR_CODES.NOT_FOUND, {
        id: input.id,
        reason: "DEAD_LETTER_NOT_FOUND",
      });
    }

    await this.outboxRepo.discardDeadLetter(
      input.id,
      input.reason,
      actorUserId,
      input.permanent,
    );

    this.logger.log({
      msg: "event_dlq_discarded",
      outboxId: input.id,
      eventType: existing.eventType,
      reason: input.reason,
      permanent: input.permanent ?? false,
      actorUserId,
    });

    return {
      discarded: true,
      id: input.id,
      permanent: Boolean(input.permanent),
    };
  }
}
