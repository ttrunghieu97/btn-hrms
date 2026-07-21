import { Injectable } from "@nestjs/common";
import { ReconciliationContext, AttendanceViolation, AttendanceViolationRule } from "./interfaces";
import { LateArrivalRule } from "./rules/late-arrival.rule";
import { EarlyDepartureRule } from "./rules/early-departure.rule";
import { MissingCheckOutRule } from "./rules/missing-checkout.rule";
import { AbsentRule } from "./rules/absent.rule";
import { UnscheduledAttendanceRule } from "./rules/unscheduled-attendance.rule";
import { OvertimeRule } from "./rules/overtime.rule";

@Injectable()
export class AttendanceViolationEngine {
  private readonly rules: AttendanceViolationRule[] = [
    new LateArrivalRule(),
    new EarlyDepartureRule(),
    new MissingCheckOutRule(),
    new AbsentRule(),
    new UnscheduledAttendanceRule(),
    new OvertimeRule(),
  ];

  evaluate(context: ReconciliationContext): AttendanceViolation[] {
    const violations: AttendanceViolation[] = [];
    for (const rule of this.rules) {
      const result = rule.evaluate(context);
      violations.push(...result);
    }
    return violations;
  }
}
