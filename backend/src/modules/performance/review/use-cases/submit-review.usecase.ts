import { Injectable } from "@nestjs/common";
import { ReviewAssignmentRepository } from "../repositories/review-assignment.repository";
import { SubmitReviewDto } from "../../dto/performance.dto";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { ReviewSubmittedEvent } from "../../../../core/events/events/review-submitted.event";

@Injectable()
export class SubmitReviewUseCase {
  constructor(
    private readonly reviewRepo: ReviewAssignmentRepository,
    private readonly eventOutbox: EventOutboxService,
  ) {}

  async execute(reviewAssignmentId: string, reviewerId: string, dto: SubmitReviewDto): Promise<void> {
    const assignment = await this.reviewRepo.findById(reviewAssignmentId);
    if (!assignment) throwNotFound("Review assignment not found", ERROR_CODES.NOT_FOUND);
    if (assignment.reviewerId !== reviewerId) throwBadRequest("Only assigned reviewer can submit", ERROR_CODES.INVALID_REQUEST);
    if (assignment.status === "submitted") throwBadRequest("Review already submitted", ERROR_CODES.INVALID_REQUEST);

    // Save ratings
    if (dto.ratings) {
      for (const r of dto.ratings) {
        await this.reviewRepo.insertRating({
          reviewAssignmentId, competencyId: r.competencyId,
          score: String(r.score), comment: r.comment ?? null,
        });
      }
    }

    await this.reviewRepo.update(reviewAssignmentId, { status: "submitted", overallComment: dto.overallComment ?? null, submittedAt: new Date() });
    await this.eventOutbox.stage(new ReviewSubmittedEvent({
      reviewAssignmentId, cycleId: assignment.cycleId,
      employeeId: assignment.employeeId, reviewerId,
      reviewType: assignment.reviewType,
    }));
  }
}
