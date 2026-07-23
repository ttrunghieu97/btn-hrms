import { DomainEvent } from "../domain-event.base";

export type GoalSubmittedPayload = {
  goalId: string;
  cycleId: string;
  employeeId: string;
};

export class GoalSubmittedEvent extends DomainEvent<GoalSubmittedPayload> {
  static readonly eventType = "performance.goal.submitted.v1";
  static readonly eventVersion = 1;

  constructor(payload: GoalSubmittedPayload, correlationId?: string) {
    super(GoalSubmittedEvent.eventType, "performance", payload, correlationId);
  }
}
