import { Injectable } from "@nestjs/common";
import { LearningPathRepository } from "../repositories/learning-path.repository";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { LearningPathCompletedEvent } from "../../../../core/events/events/learning-path-completed.event";
@Injectable()
export class CompleteLearningPathUseCase {
  constructor(private readonly repo: LearningPathRepository, private readonly eventOutbox: EventOutboxService) {}
  async execute(pathId: string, employeeId: string): Promise<void> {
    const assignment = await this.repo.findAssignment(pathId, employeeId);
    if (!assignment) throwNotFound("Assignment not found", ERROR_CODES.NOT_FOUND);
    if (assignment.status === "completed") throwBadRequest("Already completed", ERROR_CODES.INVALID_REQUEST);
    await this.repo.updateAssignment(assignment.id, { status: "completed", completedAt: new Date() });
    await this.eventOutbox.stage(new LearningPathCompletedEvent({ assignmentId: assignment.id, pathId, employeeId }));
  }
}