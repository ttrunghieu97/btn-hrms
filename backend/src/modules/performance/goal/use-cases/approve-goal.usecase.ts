import { Injectable } from "@nestjs/common";
import { EmployeeGoalRepository } from "../repositories/employee-goal.repository";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { GoalApprovedEvent } from "../../../../core/events/events/goal-approved.event";

@Injectable()
export class ApproveGoalUseCase {
  constructor(
    private readonly goalRepo: EmployeeGoalRepository,
    private readonly eventOutbox: EventOutboxService,
  ) {}

  async execute(goalId: string, approvedByUserId: string): Promise<void> {
    const goal = await this.goalRepo.findGoalById(goalId);
    if (!goal) throwNotFound("Goal not found", ERROR_CODES.NOT_FOUND);
    if (goal.status !== "submitted") throwBadRequest("Only submitted goals can be approved", ERROR_CODES.INVALID_REQUEST);
    await this.goalRepo.updateGoal(goalId, { status: "approved" });
    await this.eventOutbox.stage(new GoalApprovedEvent({ goalId, cycleId: goal.cycleId, employeeId: "", approvedByUserId }));
  }
}
