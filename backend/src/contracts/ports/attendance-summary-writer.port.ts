import { InjectionToken } from "@nestjs/common";

export interface AttendanceSummaryPatch {
  employeeId: string;
  workDate: string;
  status?: string;
  leaveRequestId?: string | null;
}

export interface IAttendanceSummaryWriterPort {
  upsertFromLeave(employeeId: string, workDate: string, status: string, leaveRequestId: string | null): Promise<void>;
}

export const ATTENDANCE_SUMMARY_WRITER_PORT = Symbol("ATTENDANCE_SUMMARY_WRITER_PORT");
