import { BadRequestException } from "@nestjs/common";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ERROR_REASONS } from "../../../../shared/constants/error-reasons";
import { type EmployeesRepository } from "../repositories/employees.repository";

const MAX_HIERARCHY_DEPTH = 50;

export const MANAGER_HIERARCHY_CYCLE_DETECTED = "MANAGER_HIERARCHY_CYCLE_DETECTED";

export class EmployeeHierarchyGuard {
  static async validateNoCycles(params: {
    employeeId: string;
    managerId: string | null | undefined;
    employeesRepo: EmployeesRepository;
  }): Promise<void> {
    const { employeeId, managerId, employeesRepo } = params;

    if (!managerId) return;

    if (managerId === employeeId) {
      throw new BadRequestException(MANAGER_HIERARCHY_CYCLE_DETECTED);
    }

    const visited = new Set<string>();
    let current: string | null = managerId;
    let depth = 0;

    while (current) {
      if (depth >= MAX_HIERARCHY_DEPTH) {
        throw new BadRequestException(MANAGER_HIERARCHY_CYCLE_DETECTED);
      }

      if (visited.has(current)) {
        throw new BadRequestException(MANAGER_HIERARCHY_CYCLE_DETECTED);
      }
      visited.add(current);

      if (current === employeeId) {
        throw new BadRequestException(MANAGER_HIERARCHY_CYCLE_DETECTED);
      }

      const mgr = await employeesRepo.findCurrentOrgAssignment(current);
      if (!mgr?.managerEmployeeId) break;

      current = mgr.managerEmployeeId;
      depth++;
    }
  }
}
