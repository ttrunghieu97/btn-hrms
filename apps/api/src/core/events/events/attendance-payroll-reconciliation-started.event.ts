import { DomainEvent } from "../domain-event.base";

export type AttendancePayrollReconciliationStartedPayload = {
  period: string;
  reconciliationId: string;
};

export class AttendancePayrollReconciliationStartedEvent extends DomainEvent<AttendancePayrollReconciliationStartedPayload> {
  static readonly eventType = "attendance.payroll.reconciliation.started.v1";
  static readonly eventVersion = 1;

  constructor(payload: AttendancePayrollReconciliationStartedPayload) {
    super(AttendancePayrollReconciliationStartedEvent.eventType, "attendance", payload);
  }
}
