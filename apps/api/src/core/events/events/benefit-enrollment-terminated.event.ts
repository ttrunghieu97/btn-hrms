import { DomainEvent } from "../domain-event.base";
export type BenefitEnrollmentTerminatedPayload = {
  enrollmentId: string; planId: string; employeeId: string; terminatedByUserId: string;
};
export class BenefitEnrollmentTerminatedEvent extends DomainEvent<BenefitEnrollmentTerminatedPayload> {
  static readonly eventType = "benefits.enrollment.terminated.v1";
  static readonly eventVersion = 1;
  constructor(payload: BenefitEnrollmentTerminatedPayload, correlationId?: string) {
    super(BenefitEnrollmentTerminatedEvent.eventType, "benefits", payload, correlationId);
  }
}
