import { DomainEvent } from "../domain-event.base";
export type ExpenseClaimReimbursedEventPayload = { claimId: string; employeeId: string; totalAmount: string };
export class ExpenseClaimReimbursedEvent extends DomainEvent<ExpenseClaimReimbursedEventPayload> {
  static readonly eventType = "expenses.claim.reimbursed.v1";
  static readonly eventVersion = 1;
  constructor(payload: ExpenseClaimReimbursedEventPayload, correlationId?: string) {
    super(ExpenseClaimReimbursedEvent.eventType, "expenses", payload, correlationId);
  }
}
