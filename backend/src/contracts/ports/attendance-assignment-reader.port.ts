/**
 * Attendance Assignment Reader — cross-context port for Attendance.
 *
 * Returns the *expected* assignment for an employee on a given day.
 * Attendance only consumes this contract; it never imports Schedule entities.
 *
 * Phase 2A: fake adapter always returns null (no real Schedule integration).
 * Phase 2B: swap with real adapter querying roster/assignment tables.
 * Phase 2C: Reconciliation uses this to detect violations.
 *
 * Design principle:
 *   CurrentAssignment is an Attendance DTO, not a Schedule entity.
 *   Schedule can change its schema without affecting Attendance.
 */

export const ATTENDANCE_ASSIGNMENT_READER_PORT =
  "ATTENDANCE_ASSIGNMENT_READER_PORT";

export interface CurrentAssignmentShift {
  id: string;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  isNightShift: boolean;
  breakMinutes: number;
}

export interface CurrentAssignmentSite {
  id: string;
  name: string;
  latitude: string;
  longitude: string;
  radiusMeters: number;
  allowedIpCidrs: string[];
}

export type AssignmentSource = "ROSTER" | "DEFAULT_SHIFT" | "MANUAL";

export interface CurrentAssignment {
  assignmentId: string;
  shift: CurrentAssignmentShift;
  site?: CurrentAssignmentSite | null;
  timezone: string; // IANA timezone, e.g. "Asia/Ho_Chi_Minh"
  assignmentSource: AssignmentSource;
}

export interface AttendanceAssignmentReaderPort {
  /**
   * Resolve the employee's expected work assignment for a specific date.
   *
   * Returns null when:
   *   - No shift roster published for that date
   *   - Employee not assigned
   *   - Day is a day-off / holiday (future: HolidayReaderPort)
   *
   * Throws only on infrastructure errors, never for "no assignment".
   */
  resolveTodayAssignment(
    employeeId: string,
    date: string,
  ): Promise<CurrentAssignment | null>;
}
