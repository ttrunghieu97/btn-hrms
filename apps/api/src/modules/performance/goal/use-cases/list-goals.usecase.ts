import { Injectable } from "@nestjs/common";
import { EmployeeGoalRepository } from "../repositories/employee-goal.repository";
import { GoalResponseDto } from "../../dto/performance.dto";

@Injectable()
export class ListGoalsUseCase {
  constructor(private readonly goalRepo: EmployeeGoalRepository) {}
  async execute(cycleId: string): Promise<GoalResponseDto[]> {
    const rows = await this.goalRepo.findGoalsByCycle(cycleId);
    return rows.map((r) => ({ id: r.id, title: r.title, status: r.status }));
  }
}
