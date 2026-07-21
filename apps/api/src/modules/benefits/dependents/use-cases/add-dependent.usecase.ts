import { Injectable } from "@nestjs/common";
import { BenefitEnrollmentRepository } from "../../enrollment/repositories/benefit-enrollment.repository";
import { AddDependentDto } from "../../dto/benefit.dto";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
@Injectable()
export class AddDependentUseCase {
  constructor(private readonly enrollRepo: BenefitEnrollmentRepository) {}
  async execute(dto: AddDependentDto): Promise<void> {
    const enrollment = await this.enrollRepo.findById(dto.enrollmentId);
    if (!enrollment) throwNotFound("Enrollment not found", ERROR_CODES.NOT_FOUND);
    if (enrollment.status !== "active") throwBadRequest("Enrollment must be active", ERROR_CODES.INVALID_REQUEST);
    await this.enrollRepo.insertDependent({
      enrollmentId: dto.enrollmentId, fullName: dto.fullName,
      relationship: dto.relationship, dateOfBirth: dto.dateOfBirth ?? null,
    });
  }
}
