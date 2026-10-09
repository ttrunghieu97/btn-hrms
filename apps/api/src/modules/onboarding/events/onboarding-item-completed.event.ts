import { DomainEvent } from "../../../core/events/domain-event.base";

export type OnboardingItemCompletedPayload = {
  processId: string;
  itemId: string;
  status: string;
  completedByUserId?: string | null;
  completedAt?: string | null;
  notes?: string | null;
};

export class OnboardingItemCompletedEvent extends DomainEvent<OnboardingItemCompletedPayload> {
  static readonly eventType = "onboarding.item.completed.v1";
  static readonly eventVersion = 1;

  constructor(payload: OnboardingItemCompletedPayload, correlationId?: string) {
    super(OnboardingItemCompletedEvent.eventType, "onboarding", payload, correlationId);
  }
}
