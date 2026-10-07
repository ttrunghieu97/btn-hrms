import { Injectable } from "@nestjs/common";
import { throwNotFound, throwConflict } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { PositionReclassifiedEvent } from "../../../workforce/domain/events/position-reclassified.event";
import { PositionsRepository } from "../repositories/positions.repository";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { ScopedDbService } from "../../../../infrastructure/database/scoped-db.service";

@Injectable()
export class UpdatePositionUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly positionsRepo: PositionsRepository,
    private readonly eventOutbox: EventOutboxService,
    private readonly requestContext: RequestContextService,
    private readonly scopedDb: ScopedDbService,
  ) {
    this.logger = new ContextLogger(this.requestContext, UpdatePositionUseCase.name);
  }

  async execute(id: string, data: { name?: string; description?: string; jobCategory?: string }): Promise<void> {
    const existing = await this.positionsRepo.getActive(id);
    if (!existing) {
      throwNotFound("Position not found", ERROR_CODES.POSITION_NOT_FOUND, { id });
    }

    if (data.name && data.name !== existing.name) {
      const duplicate = await this.positionsRepo.findActiveByTitle(data.name);
      if (duplicate) {
        throwConflict("Position name already exists", ERROR_CODES.POSITION_TITLE_ALREADY_EXISTS, { name: data.name });
      }
    }

    const db = this.scopedDb.getDb();
    await db.transaction(async (tx) => {
      await this.positionsRepo.update(id, { ...data, updatedAt: new Date(), jobCategory: data.jobCategory as any }, tx as any);
      const event = new PositionReclassifiedEvent({
        positionId: id,
        effectiveDate: new Date().toISOString(),
      });
      await this.eventOutbox.stage(event, tx as any);
    });
  }
}
