import { Injectable } from "@nestjs/common";
import { PerformanceCycleRepository } from "../repositories/performance-cycle.repository";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";


@Injectable()
export class ApproveCycleUseCase {
  constructor(
    private readonly repo: PerformanceCycleRepository,
    private readonly eventOutbox: EventOutboxService,
  ) {}

  async execute(id: string, actorUserId: string): Promise<void> {
    const cycle = await this.repo.findById(id);
    if (!cycle) throwNotFound("Performance cycle not found", ERROR_CODES.NOT_FOUND);
    if (cycle.status !== "ready_for_approval") throwBadRequest(
      'Cycle must be in "ready_for_approval" status to transition to "approved"',
      ERROR_CODES.INVALID_REQUEST,
    );
    await this.repo.update(id, { status: "approved" });

  }
}
