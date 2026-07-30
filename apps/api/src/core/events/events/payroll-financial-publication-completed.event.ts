import { DomainEvent } from "../domain-event.base";

export type PayrollFinancialPublicationCompletedPayload = {
  payrollRunId: string;
  publicationReference: string;
  scopeId: string;
};

export class PayrollFinancialPublicationCompletedEvent extends DomainEvent<PayrollFinancialPublicationCompletedPayload> {
  static readonly eventType = "payroll.financial-publication.completed.v1";
  static readonly eventVersion = 1;

  constructor(payload: PayrollFinancialPublicationCompletedPayload) {
    super(PayrollFinancialPublicationCompletedEvent.eventType, "payroll", payload);
  }
}
