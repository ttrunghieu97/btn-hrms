import { Injectable } from "@nestjs/common";
import { EventOutboxRepository, type ClaimedOutboxRow } from "../event-outbox.repository";
import { ContextLogger } from "../../../shared/logging/context-logger";
import { RequestContextService } from "../../../shared/context/request-context.service";
import { throwNotFound } from "../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../shared/constants/error-codes";

@Injectable()
export class GetDeadLetterUseCase {
  private readonly logger: ContextLogger;

  constructor(
    private readonly outboxRepo: EventOutboxRepository,
    requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(requestContext, GetDeadLetterUseCase.name);
  }

  async execute(id: string): Promise<ClaimedOutboxRow> {
    const row = await this.outboxRepo.findDeadLetterById(id);
    if (!row) {
      this.logger.warn({
        msg: "event_dlq_not_found",
        outboxId: id,
      });
      throwNotFound("Dead letter event not found", ERROR_CODES.NOT_FOUND, {
        id,
        reason: "DEAD_LETTER_NOT_FOUND",
      });
    }

    this.logger.log({
      msg: "event_dlq_inspected",
      outboxId: id,
      eventType: row.eventType,
      attemptCount: row.attemptCount,
    });

    return row;
  }
}
