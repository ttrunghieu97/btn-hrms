import { DomainEvent } from "../domain-event.base";

export type ExpenseSubmittedPayload = {
  scopeId: string;
  expenseId: string;
  employeeId: string;
  userId: string;
  approverUserId?: string | null;
};

export class ExpenseSubmittedEvent extends DomainEvent<ExpenseSubmittedPayload> {
  static readonly eventType = "expenses.expense.submitted.v1";
  static readonly eventVersion = 1;

  constructor(payload: ExpenseSubmittedPayload, correlationId?: string) {
    super(ExpenseSubmittedEvent.eventType, "expenses", payload, correlationId);
  }
}
