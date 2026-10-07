import { Injectable } from "@nestjs/common";
import { EmployeeGoalRepository } from "../repositories/employee-goal.repository";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";

@Injectable()
export class AssignGoalUseCase {
  constructor(private readonly goalRepo: EmployeeGoalRepository) {}

  async execute(goalId: string, employeeId: string, weight = "1"): Promise<void> {
    const goal = await this.goalRepo.findGoalById(goalId);
    if (!goal) throwNotFound("Goal not found", ERROR_CODES.NOT_FOUND);
    if (goal.status !== "draft") throwBadRequest("Can only assign goal in draft status", ERROR_CODES.INVALID_REQUEST);
    await this.goalRepo.insertAssignment({ goalId, employeeId, weight });
  }
}
