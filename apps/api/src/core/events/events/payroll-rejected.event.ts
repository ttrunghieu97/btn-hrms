import { DomainEvent } from "../domain-event.base";

export type PayrollRejectedPayload = {
  payrollRunId: string;
  rejectedByUserId: string;
  reason: string;
  scopeId: string;
};

export class PayrollRejectedEvent extends DomainEvent<PayrollRejectedPayload> {
  static readonly eventType = "payroll.rejected.v1";
  static readonly eventVersion = 1;

  constructor(payload: PayrollRejectedPayload) {
    super(PayrollRejectedEvent.eventType, "payroll", payload);
  }
}
