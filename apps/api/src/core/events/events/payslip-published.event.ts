import { DomainEvent } from "../domain-event.base";

export type PayslipPublishedPayload = {
  payslipId: string;
  employeeId: string;
  payrollRunId?: string | null;
};

export class PayslipPublishedEvent extends DomainEvent<PayslipPublishedPayload> {
  static readonly eventType = "payroll.payslip.published.v1";

  constructor(payload: PayslipPublishedPayload, correlationId?: string) {
    super(PayslipPublishedEvent.eventType, "payroll", payload, correlationId);
  }
}
