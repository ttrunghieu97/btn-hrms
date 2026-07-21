import { Injectable } from "@nestjs/common";
import { BenefitEnrollmentRepository } from "../repositories/benefit-enrollment.repository";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
@Injectable()
export class CancelEnrollmentUseCase {
  constructor(private readonly enrollRepo: BenefitEnrollmentRepository) {}
  async execute(id: string): Promise<void> {
    const enrollment = await this.enrollRepo.findById(id);
    if (!enrollment) throwNotFound("Enrollment not found", ERROR_CODES.NOT_FOUND);
    if (enrollment.status === "cancelled" || enrollment.status === "terminated") throwBadRequest("Enrollment already ended", ERROR_CODES.INVALID_REQUEST);
    await this.enrollRepo.update(id, { status: "cancelled", cancelledAt: new Date() });
  }
}
