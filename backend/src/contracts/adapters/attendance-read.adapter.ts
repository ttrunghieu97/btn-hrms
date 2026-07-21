import { Injectable } from "@nestjs/common";
import { AttendanceSummaryReadService } from "../../modules/attendance/attendance-summaries/read-model/attendance-summary-read.service";
import { AttendanceReadPort, EffectiveAttendanceSummary } from "../ports/attendance-read.port";

@Injectable()
export class AttendanceReadAdapter implements AttendanceReadPort {
  constructor(private readonly readService: AttendanceSummaryReadService) {}

  async getEffectiveDailySummaries(
    employeeIds: string[],
    startDate: string,
    endDate: string,
  ): Promise<EffectiveAttendanceSummary[]> {
    const summaries = await this.readService.getEffectiveSummaries(
      employeeIds,
      startDate,
      endDate,
    );

    return summaries.map((item) => ({
      employeeId: item.employeeId,
      workDate: item.workDate,
      status: item.resolvedStatus,
      scheduledMinutes: item.scheduledMinutes,
      workedMinutes: item.resolvedWorkedMinutes,
      breakMinutes: item.breakMinutes,
      lateMinutes: item.resolvedLateMinutes,
      earlyLeaveMinutes: item.resolvedEarlyLeaveMinutes,
      overtimeMinutes: item.resolvedOvertimeMinutes,
      isHoliday: item.isHoliday ?? false,
      hasOverride: item.hasOverride,
      exceptionState: item.exceptionState,
    }));
  }
}
