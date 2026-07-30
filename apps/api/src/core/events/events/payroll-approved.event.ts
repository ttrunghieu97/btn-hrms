import { DomainEvent } from "../domain-event.base";

export type PayrollApprovedPayload = {
  payrollRunId: string;
  approvedByUserId: string;
  scopeId: string;
};

export class PayrollApprovedEvent extends DomainEvent<PayrollApprovedPayload> {
  static readonly eventType = "payroll.approved.v1";
  static readonly eventVersion = 1;

  constructor(payload: PayrollApprovedPayload) {
    super(PayrollApprovedEvent.eventType, "payroll", payload);
  }
}
