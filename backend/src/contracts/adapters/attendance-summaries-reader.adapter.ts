import { Injectable } from "@nestjs/common";
import { AttendanceSummariesRepository } from "../../modules/attendance/attendance-summaries/repositories/attendance-summaries.repository";
import { IAttendanceSummariesReader } from "../ports/attendance-summaries-reader.port";

@Injectable()
export class AttendanceSummariesReaderAdapter implements IAttendanceSummariesReader {
  constructor(private readonly repo: AttendanceSummariesRepository) {}

  async findByEmployeeAndDate(employeeId: string, date: string) {
    return this.repo.findByEmployeeAndDate(employeeId, date);
  }

  async findByEmployeeAndDates(employeeId: string, workDates: string[]) {
    return this.repo.findByEmployeeAndDates(employeeId, workDates);
  }

  async findByLeaveRequestId(leaveRequestId: string) {
    return this.repo.findByLeaveRequestId(leaveRequestId);
  }
}
