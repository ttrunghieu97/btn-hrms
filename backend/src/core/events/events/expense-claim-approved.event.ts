import { DomainEvent } from "../domain-event.base";
export type ExpenseClaimApprovedEventPayload = { claimId: string; employeeId: string; approvedByUserId: string };
export class ExpenseClaimApprovedEvent extends DomainEvent<ExpenseClaimApprovedEventPayload> {
  static readonly eventType = "expenses.claim.approved.v1";
  static readonly eventVersion = 1;
  constructor(payload: ExpenseClaimApprovedEventPayload, correlationId?: string) {
    super(ExpenseClaimApprovedEvent.eventType, "expenses", payload, correlationId);
  }
}
