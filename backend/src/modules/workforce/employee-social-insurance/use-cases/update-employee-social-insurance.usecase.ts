import { Injectable } from "@nestjs/common";
import { EmployeeSocialInsuranceRepository } from "../repositories/employee-social-insurance.repository";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";

@Injectable()
export class UpdateEmployeeSocialInsuranceUseCase {
  constructor(
    private readonly repo: EmployeeSocialInsuranceRepository,
  ) {}

  async execute(
    enrollmentId: string,
    data: { insuranceNumber?: string; startDate?: string; endDate?: string; status?: string; reason?: string },
  ) {
    const existing = await this.repo.findById(enrollmentId);
    if (!existing) {
      throwNotFound("Social insurance enrollment not found", ERROR_CODES.SOCIAL_INSURANCE_NOT_FOUND, { enrollmentId });
    }

    const updateData: any = {};
    if (data.insuranceNumber !== undefined) updateData.insuranceNumber = data.insuranceNumber;
    if (data.startDate !== undefined) updateData.startDate = data.startDate;
    if (data.endDate !== undefined) updateData.endDate = data.endDate;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.reason !== undefined) updateData.reason = data.reason;

    return this.repo.update(enrollmentId, updateData);
  }
}
