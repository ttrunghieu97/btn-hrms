import { DomainEvent } from "../domain-event.base";

export type AttendancePayrollReconciliationCompletedPayload = {
  period: string;
  reconciliationId: string;
  totalEmployees: number;
  matchedCount: number;
  mismatchCount: number;
};

export class AttendancePayrollReconciliationCompletedEvent extends DomainEvent<AttendancePayrollReconciliationCompletedPayload> {
  static readonly eventType = "attendance.payroll.reconciliation.completed.v1";
  static readonly eventVersion = 1;

  constructor(payload: AttendancePayrollReconciliationCompletedPayload) {
    super(AttendancePayrollReconciliationCompletedEvent.eventType, "attendance", payload);
  }
}
