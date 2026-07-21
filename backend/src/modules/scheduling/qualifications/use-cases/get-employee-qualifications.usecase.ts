import { Injectable } from "@nestjs/common";
import { EmployeeQualificationsRepository } from "../repositories/employee-qualifications.repository";
import type { EmployeeQualificationWithNames } from "../repositories/employee-qualifications.repository.contract";

@Injectable()
export class GetEmployeeQualificationsUseCase {
  constructor(
    private readonly repo: EmployeeQualificationsRepository
  ) {}

  async execute(employeeId: string): Promise<EmployeeQualificationWithNames[]> {
    return this.repo.getEmployeeQualifications(employeeId);
  }
}
