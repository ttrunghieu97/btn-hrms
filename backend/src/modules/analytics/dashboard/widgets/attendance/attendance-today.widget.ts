import { Injectable } from "@nestjs/common";
import { todayDateString } from "../../../../../shared/utils/date-format";
import type { DashboardWidgetProvider } from "../../application/interfaces/dashboard-widget-provider.interface";
import type { DashboardContext } from "../../application/interfaces/dashboard-context.interface";
import { AttendanceAggregateService } from "../../infrastructure/repositories/attendance-aggregate.service";

export interface AttendanceTodayData {
  totalCheckIns: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  onTimeCount: number;
}

@Injectable()
export class AttendanceTodayWidgetProvider
  implements DashboardWidgetProvider<AttendanceTodayData>
{
  constructor(
    private readonly attendance: AttendanceAggregateService,
  ) {}

  supports(_ctx: DashboardContext): boolean {
    return true;
  }

  async execute(_ctx: DashboardContext): Promise<AttendanceTodayData> {
    const today = todayDateString();
    return this.attendance.getTodaySummary(today);
  }
}
