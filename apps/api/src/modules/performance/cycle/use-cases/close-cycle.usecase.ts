import { Injectable } from "@nestjs/common";
import { PerformanceCycleRepository } from "../repositories/performance-cycle.repository";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { PerformanceCycleClosedEvent } from "../../../../core/events/events/performance-cycle-closed.event";

@Injectable()
export class CloseCycleUseCase {
  constructor(
    private readonly repo: PerformanceCycleRepository,
    private readonly eventOutbox: EventOutboxService,
  ) {}

  async execute(id: string, actorUserId: string): Promise<void> {
    const cycle = await this.repo.findById(id);
    if (!cycle) throwNotFound("Performance cycle not found", ERROR_CODES.NOT_FOUND);
    if (cycle.status !== "published") throwBadRequest(
      'Cycle must be in "published" status to transition to "closed"',
      ERROR_CODES.INVALID_REQUEST,
    );
    await this.repo.update(id, { status: "closed" });
    await this.eventOutbox.stage(new PerformanceCycleClosedEvent({ cycleId: id, closedByUserId: actorUserId }));
  }
}
