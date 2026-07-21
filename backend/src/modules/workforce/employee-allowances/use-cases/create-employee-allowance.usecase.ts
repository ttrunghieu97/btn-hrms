import { Injectable } from "@nestjs/common";
import { EmployeeAllowancesRepository } from "../repositories/employee-allowances.repository";
import { throwBadRequest } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ERROR_REASONS } from "../../../../shared/constants/error-reasons";

@Injectable()
export class CreateEmployeeAllowanceUseCase {
  constructor(
    private readonly allowancesRepo: EmployeeAllowancesRepository,
  ) {}

  async execute(
    employeeId: string,
    data: { type: string; amount: number; effectiveFrom: string; effectiveTo?: string; note?: string },
  ) {
    if (!data.type || data.amount === undefined) {
      throwBadRequest("type and amount are required", ERROR_CODES.INVALID_REQUEST, {
        reason: ERROR_REASONS.INVALID_STATE,
      });
    }

    const allowance = await this.allowancesRepo.create({
      employeeId,
      type: data.type as "position" | "salary" | "seniority" | "professional_seniority" | "additional",
      amount: String(data.amount),
      effectiveFrom: data.effectiveFrom,
      effectiveTo: data.effectiveTo ?? null,
      note: data.note ?? null,
    });

    return allowance;
  }
}
