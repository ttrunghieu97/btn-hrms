import { DomainEvent } from "../../../core/events/domain-event.base";

export type OnboardingCompletedPayload = {
  processId: string;
  employeeId: string;
  completedAt: string;
};

export class OnboardingCompletedEvent extends DomainEvent<OnboardingCompletedPayload> {
  static readonly eventType = "onboarding.process.completed.v1";
  static readonly eventVersion = 1;

  constructor(payload: OnboardingCompletedPayload, correlationId?: string) {
    super(OnboardingCompletedEvent.eventType, "onboarding", payload, correlationId);
  }
}
