import { Injectable } from "@nestjs/common";
import { BenefitEnrollmentRepository } from "../repositories/benefit-enrollment.repository";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { BenefitEnrollmentApprovedEvent } from "../../../../core/events/events/benefit-enrollment-approved.event";
@Injectable()
export class ApproveEnrollmentUseCase {
  constructor(
    private readonly enrollRepo: BenefitEnrollmentRepository,
    private readonly eventOutbox: EventOutboxService,
  ) {}
  async execute(id: string, approvedByUserId: string): Promise<void> {
    const enrollment = await this.enrollRepo.findById(id);
    if (!enrollment) throwNotFound("Enrollment not found", ERROR_CODES.NOT_FOUND);
    if (enrollment.status !== "pending") throwBadRequest("Only pending enrollments can be approved", ERROR_CODES.INVALID_REQUEST);
    await this.enrollRepo.update(id, { status: "active", approvedByUserId, approvedAt: new Date() });
    await this.eventOutbox.stage(new BenefitEnrollmentApprovedEvent({
      enrollmentId: id, planId: enrollment.planId, employeeId: enrollment.employeeId,
      employerContribution: enrollment.employerContribution,
      employeeContribution: enrollment.employeeContribution,
      effectiveFrom: enrollment.effectiveFrom, approvedByUserId,
    }));
  }
}
