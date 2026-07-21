import { Injectable } from "@nestjs/common";
import { ReviewAssignmentRepository } from "../repositories/review-assignment.repository";

@Injectable()
export class ListReviewsUseCase {
  constructor(private readonly repo: ReviewAssignmentRepository) {}
  async execute(cycleId: string) {
    // Return all review assignments for a cycle with their ratings
    return this.repo.countByCycle(cycleId);
  }
}
