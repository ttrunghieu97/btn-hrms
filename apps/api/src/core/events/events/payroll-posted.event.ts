import { DomainEvent } from "../domain-event.base";

export type PayrollPostedPayload = {
  payrollRunId: string;
  postedByUserId: string;
  scopeId: string;
};

export class PayrollPostedEvent extends DomainEvent<PayrollPostedPayload> {
  static readonly eventType = "payroll.posted.v1";
  static readonly eventVersion = 1;

  constructor(payload: PayrollPostedPayload) {
    super(PayrollPostedEvent.eventType, "payroll", payload);
  }
}
