import { Injectable } from "@nestjs/common";
import { EmployeeSocialInsuranceRepository } from "../repositories/employee-social-insurance.repository";
import { throwBadRequest } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ERROR_REASONS } from "../../../../shared/constants/error-reasons";

@Injectable()
export class CreateEmployeeSocialInsuranceUseCase {
  constructor(
    private readonly repo: EmployeeSocialInsuranceRepository,
  ) {}

  async execute(
    employeeId: string,
    data: { insuranceNumber: string; startDate: string; endDate?: string; status?: string; reason?: string },
  ) {
    if (!data.insuranceNumber || !data.startDate) {
      throwBadRequest("insuranceNumber and startDate are required", ERROR_CODES.INVALID_REQUEST, {
        reason: ERROR_REASONS.INVALID_STATE,
      });
    }

    return this.repo.create({
      employeeId,
      insuranceNumber: data.insuranceNumber,
      startDate: data.startDate,
      endDate: data.endDate ?? null,
      status: (data.status ?? "active") as any,
      reason: data.reason ?? null,
    });
  }
}
