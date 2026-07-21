import { DomainEvent } from "../domain-event.base";

export type PayrollProcessedPayload = {
  scopeId: string;
  payrollRunId: string;
  processedByUserId?: string | null;
};

export class PayrollProcessedEvent extends DomainEvent<PayrollProcessedPayload> {
  static readonly eventType = "payroll.run.processed.v1";
  static readonly eventVersion = 1;

  constructor(payload: PayrollProcessedPayload, correlationId?: string) {
    super(PayrollProcessedEvent.eventType, "payroll", payload, correlationId);
  }
}
