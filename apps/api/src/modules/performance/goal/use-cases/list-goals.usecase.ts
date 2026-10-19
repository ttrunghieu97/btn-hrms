import { Injectable } from "@nestjs/common";
import { hasPermission } from "@project/permissions";
import { Permissions } from "../../../../core/security/permissions/permissions.registry";
import type { AuthUser } from "../../../../core/security/types/auth-user.interface";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { throwForbidden } from "../../../../shared/utils/http-error";
import { EmployeeGoalRepository } from "../repositories/employee-goal.repository";
import { GoalResponseDto } from "../../dto/performance.dto";

@Injectable()
export class ListGoalsUseCase {
  constructor(private readonly goalRepo: EmployeeGoalRepository) {}

  async execute(cycleId: string, user?: AuthUser): Promise<GoalResponseDto[]> {
    const canManage =
      !user ||
      Boolean(user.isSuperAdmin) ||
      hasPermission(user.permissions ?? [], Permissions.PERFORMANCE_MANAGE);

    if (!canManage && !user.employeeId) {
      throwForbidden(
        "Employee profile is required to view self-scoped performance goals",
        ERROR_CODES.FORBIDDEN,
      );
    }

    const rows = await this.goalRepo.findGoalsByCycle(cycleId);

    if (canManage) {
      return rows.map((r) => ({ id: r.id, title: r.title, status: r.status }));
    }

    const filtered: GoalResponseDto[] = [];
    for (const row of rows) {
      const assignments = await this.goalRepo.findAssignmentsByGoal(row.id);
      if (assignments.some((a) => String(a.employeeId) === String(user.employeeId))) {
        filtered.push({ id: row.id, title: row.title, status: row.status });
      }
    }

    return filtered;
  }
}
