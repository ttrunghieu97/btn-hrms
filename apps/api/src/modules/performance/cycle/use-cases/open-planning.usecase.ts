import { Injectable } from "@nestjs/common";
import { PerformanceCycleRepository } from "../repositories/performance-cycle.repository";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { PerformanceCycleOpenedEvent } from "../../../../core/events/events/performance-cycle-opened.event";

@Injectable()
export class OpenPlanningUseCase {
  constructor(
    private readonly repo: PerformanceCycleRepository,
    private readonly eventOutbox: EventOutboxService,
  ) {}

  async execute(id: string, actorUserId: string): Promise<void> {
    const cycle = await this.repo.findById(id);
    if (!cycle) throwNotFound("Performance cycle not found", ERROR_CODES.NOT_FOUND);
    if (cycle.status !== "draft") throwBadRequest(
      'Cycle must be in "draft" status to transition to "planning"',
      ERROR_CODES.INVALID_REQUEST,
    );
    await this.repo.update(id, { status: "planning" });
    await this.eventOutbox.stage(new PerformanceCycleOpenedEvent({ cycleId: id, openedByUserId: actorUserId }));
  }
}
