import { Injectable } from "@nestjs/common";
import { LearningPathRepository } from "../repositories/learning-path.repository";
import { AssignPathDto } from "../../dto/learning.dto";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { LearningPathAssignedEvent } from "../../../../core/events/events/learning-path-assigned.event";
@Injectable()
export class AssignLearningPathUseCase {
  constructor(private readonly repo: LearningPathRepository, private readonly eventOutbox: EventOutboxService) {}
  async execute(dto: AssignPathDto, assignedByUserId: string): Promise<void> {
    const path = await this.repo.findPathById(dto.pathId);
    if (!path) throwNotFound("Path not found", ERROR_CODES.NOT_FOUND);
    if (path.status !== "published") throwBadRequest("Only published paths can be assigned", ERROR_CODES.INVALID_REQUEST);
    for (const empId of dto.employeeIds) {
      const assignment = await this.repo.insertAssignment({ pathId: dto.pathId, employeeId: empId, status: "active", assignedByUserId });
      await this.eventOutbox.stage(new LearningPathAssignedEvent({ assignmentId: assignment.id, pathId: dto.pathId, employeeId: empId, assignedByUserId }));
    }
  }
}