import { Injectable } from "@nestjs/common";
import { EmployeeGoalRepository } from "../repositories/employee-goal.repository";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { GoalSubmittedEvent } from "../../../../core/events/events/goal-submitted.event";

@Injectable()
export class SubmitGoalUseCase {
  constructor(
    private readonly goalRepo: EmployeeGoalRepository,
    private readonly eventOutbox: EventOutboxService,
  ) {}

  async execute(goalId: string, employeeId: string): Promise<void> {
    const goal = await this.goalRepo.findGoalById(goalId);
    if (!goal) throwNotFound("Goal not found", ERROR_CODES.NOT_FOUND);
    if (goal.status !== "draft") throwBadRequest("Only draft goals can be submitted", ERROR_CODES.INVALID_REQUEST);

    // Verify employee is assigned
    const assignments = await this.goalRepo.findAssignmentsByGoal(goalId);
    if (!assignments.some((a) => a.employeeId === employeeId)) throwBadRequest("Employee not assigned to this goal", ERROR_CODES.INVALID_REQUEST);

    await this.goalRepo.updateGoal(goalId, { status: "submitted" });
    await this.eventOutbox.stage(new GoalSubmittedEvent({ goalId, cycleId: goal.cycleId, employeeId }));
  }
}
