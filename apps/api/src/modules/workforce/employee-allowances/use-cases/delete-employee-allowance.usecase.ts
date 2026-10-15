import { Injectable } from "@nestjs/common";
import { EmployeeAllowancesRepository } from "../repositories/employee-allowances.repository";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";

@Injectable()
export class DeleteEmployeeAllowanceUseCase {
  constructor(
    private readonly allowancesRepo: EmployeeAllowancesRepository,
  ) {}

  async execute(allowanceId: string, employeeId?: string) {
    const existing = await this.allowancesRepo.findById(allowanceId);
    if (!existing || (employeeId && existing.employeeId !== employeeId)) {
      throwNotFound("Allowance not found", ERROR_CODES.ALLOWANCE_NOT_FOUND, { allowanceId });
    }

    return this.allowancesRepo.delete(allowanceId);
  }
}
