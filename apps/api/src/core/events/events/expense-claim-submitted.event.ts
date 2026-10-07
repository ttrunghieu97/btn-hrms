import { DomainEvent } from "../domain-event.base";
export type ExpenseClaimSubmittedEventPayload = { claimId: string; employeeId: string; totalAmount: string };
export class ExpenseClaimSubmittedEvent extends DomainEvent<ExpenseClaimSubmittedEventPayload> {
  static readonly eventType = "expenses.claim.submitted.v1";
  static readonly eventVersion = 1;
  constructor(payload: ExpenseClaimSubmittedEventPayload, correlationId?: string) {
    super(ExpenseClaimSubmittedEvent.eventType, "expenses", payload, correlationId);
  }
}
