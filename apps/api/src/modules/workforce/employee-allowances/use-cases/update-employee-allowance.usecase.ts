import { Injectable } from "@nestjs/common";
import { EmployeeAllowancesRepository } from "../repositories/employee-allowances.repository";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";

@Injectable()
export class UpdateEmployeeAllowanceUseCase {
  constructor(
    private readonly allowancesRepo: EmployeeAllowancesRepository,
  ) {}

  async execute(
    allowanceId: string,
    data: { type?: string; amount?: number; effectiveFrom?: string; effectiveTo?: string; note?: string },
  ) {
    const existing = await this.allowancesRepo.findById(allowanceId);
    if (!existing) {
      throwNotFound("Allowance not found", ERROR_CODES.ALLOWANCE_NOT_FOUND, { allowanceId });
    }

    const updateData: any = {};
    if (data.type !== undefined) updateData.type = data.type as "position" | "salary" | "seniority" | "professional_seniority" | "additional";
    if (data.amount !== undefined) updateData.amount = String(data.amount);
    if (data.effectiveFrom !== undefined) updateData.effectiveFrom = data.effectiveFrom;
    if (data.effectiveTo !== undefined) updateData.effectiveTo = data.effectiveTo;
    if (data.note !== undefined) updateData.note = data.note;

    return this.allowancesRepo.update(allowanceId, updateData);
  }
}
