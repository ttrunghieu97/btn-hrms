import { Injectable } from "@nestjs/common";
import { ReviewAssignmentRepository } from "../repositories/review-assignment.repository";
import { PerformanceCycleRepository } from "../../cycle/repositories/performance-cycle.repository";
import { AssignReviewerDto } from "../../dto/performance.dto";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";

@Injectable()
export class AssignReviewerUseCase {
  constructor(
    private readonly reviewRepo: ReviewAssignmentRepository,
    private readonly cycleRepo: PerformanceCycleRepository,
  ) {}

  async execute(dto: AssignReviewerDto): Promise<void> {
    const cycle = await this.cycleRepo.findById(dto.cycleId);
    if (!cycle) throwNotFound("Cycle not found", ERROR_CODES.NOT_FOUND);
    if (cycle.status !== "self_review" && cycle.status !== "manager_review") throwBadRequest("Reviews can only be assigned during review phases", ERROR_CODES.INVALID_REQUEST);
    if (dto.reviewType !== "self" && dto.employeeId === dto.reviewerId) throwBadRequest("Employee cannot review themselves", ERROR_CODES.INVALID_REQUEST);
    await this.reviewRepo.insert({
      cycleId: dto.cycleId, employeeId: dto.employeeId, reviewerId: dto.reviewerId,
      reviewType: dto.reviewType, status: "pending", dueDate: dto.dueDate ?? null,
    });
  }
}
