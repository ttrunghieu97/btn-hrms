import { Injectable } from "@nestjs/common";
import { AttendanceSummariesRepository } from "../../modules/attendance/attendance-summaries/repositories/attendance-summaries.repository";
import { IAttendanceSummariesReader, AttendanceSummaryRecord } from "../ports/attendance-summaries-reader.port";

@Injectable()
export class AttendanceSummariesReaderAdapter implements IAttendanceSummariesReader {
  constructor(private readonly repo: AttendanceSummariesRepository) {}

  async findByEmployeeAndDate(employeeId: string, date: string): Promise<AttendanceSummaryRecord | null> {
    return this.repo.findByEmployeeAndDate(employeeId, date) as Promise<AttendanceSummaryRecord | null>;
  }

  async findByEmployeeAndDates(employeeId: string, workDates: string[]): Promise<AttendanceSummaryRecord[]> {
    return this.repo.findByEmployeeAndDates(employeeId, workDates) as Promise<AttendanceSummaryRecord[]>;
  }

  async findByLeaveRequestId(leaveRequestId: string): Promise<AttendanceSummaryRecord[]> {
    return this.repo.findByLeaveRequestId(leaveRequestId) as Promise<AttendanceSummaryRecord[]>;
  }
}
