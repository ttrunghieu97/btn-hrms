import { Injectable } from "@nestjs/common";
import { throwConflict } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { PositionCreatedEvent } from "../../../workforce/domain/events/position-created.event";
import { PositionsRepository } from "../repositories/positions.repository";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class CreatePositionUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly positionsRepo: PositionsRepository,
    private readonly eventOutbox: EventOutboxService,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, CreatePositionUseCase.name);
  }

  async execute(data: { name: string; description?: string; jobCategory?: string }): Promise<string> {
    const existing = await this.positionsRepo.findActiveByTitle(data.name);

    if (existing) {
      throwConflict("Position name already exists", ERROR_CODES.POSITION_TITLE_ALREADY_EXISTS, { name: data.name });
    }

    const positionId = await this.positionsRepo.transaction(async (tx) => {
      const id = await this.positionsRepo.createPosition(data, tx);
      const event = new PositionCreatedEvent({ positionId: id, title: data.name });
      await this.eventOutbox.stage(event, tx);
      return id;
    });

    return positionId;
  }
}

