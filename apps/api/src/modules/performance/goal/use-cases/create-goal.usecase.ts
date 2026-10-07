import { Injectable } from "@nestjs/common";
import { EmployeeGoalRepository } from "../repositories/employee-goal.repository";
import { PerformanceCycleRepository } from "../../cycle/repositories/performance-cycle.repository";
import { CreateGoalDto, GoalResponseDto } from "../../dto/performance.dto";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";

@Injectable()
export class CreateGoalUseCase {
  constructor(
    private readonly goalRepo: EmployeeGoalRepository,
    private readonly cycleRepo: PerformanceCycleRepository,
  ) {}

  async execute(cycleId: string, dto: CreateGoalDto): Promise<GoalResponseDto> {
    const cycle = await this.cycleRepo.findById(cycleId);
    if (!cycle) throwNotFound("Cycle not found", ERROR_CODES.NOT_FOUND);
    if (cycle.status !== "planning" && cycle.status !== "draft") throwBadRequest("Cycle must be in planning phase", ERROR_CODES.INVALID_REQUEST);
    if (!dto.title?.trim()) throwBadRequest("Goal title is required", ERROR_CODES.INVALID_REQUEST);

    const goal = await this.goalRepo.insertGoal({ cycleId, title: dto.title, description: dto.description ?? null, status: "draft" });

    if (dto.employeeIds) {
      for (const empId of dto.employeeIds) {
        await this.goalRepo.insertAssignment({ goalId: goal.id, employeeId: empId, weight: "1" });
      }
    }
    return { id: goal.id, title: goal.title, status: goal.status };
  }
}
