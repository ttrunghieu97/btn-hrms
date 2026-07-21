import { DomainEvent } from "../domain-event.base";
export type BenefitEnrollmentApprovedPayload = {
  enrollmentId: string; planId: string; employeeId: string;
  employerContribution: string | null; employeeContribution: string | null;
  effectiveFrom: string | null; approvedByUserId: string;
};
export class BenefitEnrollmentApprovedEvent extends DomainEvent<BenefitEnrollmentApprovedPayload> {
  static readonly eventType = "benefits.enrollment.approved.v1";
  static readonly eventVersion = 1;
  constructor(payload: BenefitEnrollmentApprovedPayload, correlationId?: string) {
    super(BenefitEnrollmentApprovedEvent.eventType, "benefits", payload, correlationId);
  }
}
