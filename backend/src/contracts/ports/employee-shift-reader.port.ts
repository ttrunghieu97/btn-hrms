/**
 * Cross-context port for read-only employee shift lookups.
 *
 * Workforce and other contexts inject this port instead of importing
 * `WorkforceShiftsRepository` from the scheduling domain directly.
 */
export const EMPLOYEE_SHIFT_READER_PORT = "EMPLOYEE_SHIFT_READER_PORT";

export interface ShiftAssignmentRecord {
  id: string;
  employeeId: string;
  shiftTemplateId: string | null;
  assignmentDate: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  status: string;
  shiftTemplate: {
    name: string;
    startTime: string;
    endTime: string;
    isNightShift: boolean;
    breakMinutes: number | null;
  } | null;
}

export interface EmployeeShiftReaderPort {
  /** Returns shift assignments for an employee within a date range. */
  getEmployeeAssignmentsForRange(
    employeeId: string,
    from: string,
    to: string,
  ): Promise<ShiftAssignmentRecord[]>;

  /** Returns the active shift assignment for an employee on a specific date, or null. */
  findShiftAssignmentForEmployeeDay(
    employeeId: string,
    workDate: string,
  ): Promise<ShiftAssignmentRecord | null>;

  /** Returns shift assignments for a list of employees on a specific assignment date. */
  findAssignmentsByDate(
    employeeIds: string[],
    date: string,
  ): Promise<ShiftAssignmentRecord[]>;
}
