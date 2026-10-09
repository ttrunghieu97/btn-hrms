import { Injectable } from "@nestjs/common";
import { EventOutboxRepository } from "../event-outbox.repository";
import { ContextLogger } from "../../../shared/logging/context-logger";
import { RequestContextService } from "../../../shared/context/request-context.service";

export interface ReplayAllDeadLettersInput {
  actorUserId?: string | null;
}

export interface ReplayAllDeadLettersResult {
  replayed: true;
  count: number;
}

@Injectable()
export class ReplayAllDeadLettersUseCase {
  private readonly logger: ContextLogger;

  constructor(
    private readonly outboxRepo: EventOutboxRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(
      requestContext,
      ReplayAllDeadLettersUseCase.name,
    );
  }

  async execute(
    input: ReplayAllDeadLettersInput = {},
  ): Promise<ReplayAllDeadLettersResult> {
    const actorUserId =
      input.actorUserId ?? this.requestContext.get()?.userId ?? null;

    const count = await this.outboxRepo.replayAllDeadLetters(actorUserId);

    this.logger.log({
      msg: "event_dlq_replay_all_executed",
      count,
      actorUserId,
    });

    return {
      replayed: true,
      count,
    };
  }
}
