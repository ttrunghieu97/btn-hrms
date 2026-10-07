import { DomainEvent } from "../../../../core/events/domain-event.base";

export type OffboardingCompletedPayload = {
  processId: string;
  employeeId: string;
};

export class OffboardingCompletedEvent extends DomainEvent<OffboardingCompletedPayload> {
  static readonly eventType = "offboarding.completed.v1";
  static readonly eventVersion = 1;

  constructor(payload: OffboardingCompletedPayload, correlationId?: string) {
    super(OffboardingCompletedEvent.eventType, "offboarding", payload, correlationId);
  }
}
