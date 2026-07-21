import { Injectable } from "@nestjs/common";
import type {
  AttendanceAssignmentReaderPort,
  CurrentAssignment,
} from "../ports/attendance-assignment-reader.port";

/**
 * FakeAttendanceAssignmentAdapter — Phase 2A implementation.
 *
 * Always returns null: no real Schedule integration yet.
 * Allows Attendance and Reconciliation to develop against a stable contract.
 *
 * Phase 2B: replace useClass with the real Schedule adapter:
 *   { provide: ATTENDANCE_ASSIGNMENT_READER_PORT, useClass: ScheduleAssignmentAdapter }
 */
@Injectable()
export class FakeAttendanceAssignmentAdapter
  implements AttendanceAssignmentReaderPort
{
  async resolveTodayAssignment(
    _employeeId: string,
    _date: string,
  ): Promise<CurrentAssignment | null> {
    return null;
  }
}
