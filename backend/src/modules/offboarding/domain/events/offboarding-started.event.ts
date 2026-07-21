import { DomainEvent } from "../../../../core/events/domain-event.base";

export type OffboardingStartedPayload = {
  processId: string;
  employeeId: string;
  templateId: string | null;
};

export class OffboardingStartedEvent extends DomainEvent<OffboardingStartedPayload> {
  static readonly eventType = "offboarding.started.v1";
  static readonly eventVersion = 1;

  constructor(payload: OffboardingStartedPayload, correlationId?: string) {
    super(OffboardingStartedEvent.eventType, "offboarding", payload, correlationId);
  }
}
