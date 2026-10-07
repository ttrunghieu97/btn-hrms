import { Injectable } from "@nestjs/common";
import { EmployeeSocialInsuranceRepository } from "../repositories/employee-social-insurance.repository";

@Injectable()
export class ListEmployeeSocialInsurancesUseCase {
  constructor(
    private readonly repo: EmployeeSocialInsuranceRepository,
  ) {}

  async execute(employeeId: string) {
    return this.repo.findByEmployeeId(employeeId);
  }
}
