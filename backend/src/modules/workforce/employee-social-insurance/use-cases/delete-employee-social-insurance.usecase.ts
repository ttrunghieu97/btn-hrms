import { Injectable } from "@nestjs/common";
import { EmployeeSocialInsuranceRepository } from "../repositories/employee-social-insurance.repository";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";

@Injectable()
export class DeleteEmployeeSocialInsuranceUseCase {
  constructor(
    private readonly repo: EmployeeSocialInsuranceRepository,
  ) {}

  async execute(enrollmentId: string) {
    const existing = await this.repo.findById(enrollmentId);
    if (!existing) {
      throwNotFound("Social insurance enrollment not found", ERROR_CODES.SOCIAL_INSURANCE_NOT_FOUND, { enrollmentId });
    }

    return this.repo.delete(enrollmentId);
  }
}
