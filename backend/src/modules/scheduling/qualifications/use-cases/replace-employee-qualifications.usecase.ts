import { Injectable } from "@nestjs/common";
import { EmployeeQualificationsRepository } from "../repositories/employee-qualifications.repository";
import type { EmployeeQualificationWithNames } from "../repositories/employee-qualifications.repository.contract";

@Injectable()
export class ReplaceEmployeeQualificationsUseCase {
  constructor(
    private readonly repo: EmployeeQualificationsRepository
  ) {}

  async execute(
    employeeId: string,
    positionIds: string[]
  ): Promise<EmployeeQualificationWithNames[]> {
    // ponytail: validation "no future assignment depends on removed position"
    // requires ShiftTemplateStaffing (Sprint 2). Add after staffing exists:
    //   get all shiftTemplateIds whose Staffing includes removedPositionIds
    //   check employeeShiftAssignments for those templateIds after today
    return this.repo.replaceEmployeeQualifications(employeeId, positionIds);
  }
}
