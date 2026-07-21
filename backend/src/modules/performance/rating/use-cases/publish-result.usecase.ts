import { Injectable } from "@nestjs/common";
import { PerformanceResultRepository } from "../repositories/performance-result.repository";
import { PerformanceCycleRepository } from "../../cycle/repositories/performance-cycle.repository";
import { PublishResultDto } from "../../dto/performance.dto";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { PerformanceResultPublishedEvent } from "../../../../core/events/events/performance-result-published.event";
import { getScopeId } from "../../../../shared/constants/system";

@Injectable()
export class PublishResultUseCase {
  constructor(
    private readonly resultRepo: PerformanceResultRepository,
    private readonly cycleRepo: PerformanceCycleRepository,
    private readonly eventOutbox: EventOutboxService,
  ) {}

  async execute(cycleId: string, dto: PublishResultDto, decidedByUserId: string): Promise<void> {
    const cycle = await this.cycleRepo.findById(cycleId);
    if (!cycle) throwNotFound("Cycle not found", ERROR_CODES.NOT_FOUND);
    if (cycle.status !== "approved") throwBadRequest("Cycle must be approved before publishing results", ERROR_CODES.INVALID_REQUEST);

    const result = await this.resultRepo.upsert({
      cycleId, employeeId: dto.employeeId,
      finalScore: dto.finalScore != null ? String(dto.finalScore) : null,
      ratingLabel: dto.ratingLabel ?? null,
      summary: dto.summary ?? null,
      decidedByUserId, decidedAt: new Date(), publishedAt: new Date(),
    });

    await this.eventOutbox.stage(new PerformanceResultPublishedEvent({
      cycleId, employeeId: dto.employeeId,
      finalScore: result.finalScore, ratingLabel: result.ratingLabel,
      decidedByUserId,
    }));
  }
}
