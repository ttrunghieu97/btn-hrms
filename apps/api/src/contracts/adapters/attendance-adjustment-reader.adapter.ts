import { Injectable } from "@nestjs/common";
import { AttendanceAdjustmentService } from "../../modules/attendance/timekeeping/services/attendance-adjustment.service";
import { IAttendanceAdjustmentReader, AttendanceAdjustmentDelta } from "../ports/attendance-adjustment-reader.port";

@Injectable()
export class AttendanceAdjustmentReaderAdapter implements IAttendanceAdjustmentReader {
  constructor(
    private readonly adjustmentService: AttendanceAdjustmentService,
  ) {}

  async getAdjustmentDeltas(
    period: string,
    employeeIds: string[],
  ): Promise<AttendanceAdjustmentDelta[]> {
    if (!employeeIds.length) return [];

    const deltasMap = await this.adjustmentService.getEffectiveDeltasForEmployees(
      period,
      employeeIds,
    );

    const result: AttendanceAdjustmentDelta[] = [];
    for (const [employeeId, delta] of deltasMap) {
      if (delta.size === 0) continue;

      result.push({
        employeeId,
        period,
        regularHoursDelta: delta.get("REGULAR_HOURS") ?? 0,
        overtimeHoursDelta: delta.get("OVERTIME_HOURS") ?? 0,
      });
    }

    return result;
  }
}
