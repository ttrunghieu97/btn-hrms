import { Injectable } from "@nestjs/common";
import { EmployeeAllowancesRepository } from "../repositories/employee-allowances.repository";

@Injectable()
export class ListEmployeeAllowancesUseCase {
  constructor(
    private readonly allowancesRepo: EmployeeAllowancesRepository,
  ) {}

  async execute(employeeId: string) {
    return this.allowancesRepo.findByEmployeeId(employeeId);
  }
}
