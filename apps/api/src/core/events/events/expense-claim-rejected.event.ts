import { DomainEvent } from "../domain-event.base";
export type ExpenseClaimRejectedEventPayload = { claimId: string; employeeId: string; rejectionReason: string | null };
export class ExpenseClaimRejectedEvent extends DomainEvent<ExpenseClaimRejectedEventPayload> {
  static readonly eventType = "expenses.claim.rejected.v1";
  static readonly eventVersion = 1;
  constructor(payload: ExpenseClaimRejectedEventPayload, correlationId?: string) {
    super(ExpenseClaimRejectedEvent.eventType, "expenses", payload, correlationId);
  }
}
