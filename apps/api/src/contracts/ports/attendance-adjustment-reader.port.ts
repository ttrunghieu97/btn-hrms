export const ATTENDANCE_ADJUSTMENT_READER = "ATTENDANCE_ADJUSTMENT_READER";

/**
 * Applied attendance adjustment delta for an employee in a period.
 * Represents the net field-level changes from all APPROVED + APPLIED
 * post-closure adjustments.
 */
export interface AttendanceAdjustmentDelta {
  employeeId: string;
  period: string;
  regularHoursDelta: number;
  overtimeHoursDelta: number;
}

/**
 * Read-only port for consuming attendance adjustment deltas.
 *
 * Attendance owns computation. Payroll consumes the resolved delta.
 * No cross-domain table access (Rule #6).
 */
export interface IAttendanceAdjustmentReader {
  /**
   * Get applied adjustment deltas for all employees in a period.
   * Returns empty array if no adjustments exist.
   */
  getAdjustmentDeltas(
    period: string,
    employeeIds: string[],
  ): Promise<AttendanceAdjustmentDelta[]>;
}
