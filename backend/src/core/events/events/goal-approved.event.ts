import { DomainEvent } from "../domain-event.base";

export type GoalApprovedPayload = {
  goalId: string;
  cycleId: string;
  employeeId: string;
  approvedByUserId: string;
};

export class GoalApprovedEvent extends DomainEvent<GoalApprovedPayload> {
  static readonly eventType = "performance.goal.approved.v1";
  static readonly eventVersion = 1;

  constructor(payload: GoalApprovedPayload, correlationId?: string) {
    super(GoalApprovedEvent.eventType, "performance", payload, correlationId);
  }
}
