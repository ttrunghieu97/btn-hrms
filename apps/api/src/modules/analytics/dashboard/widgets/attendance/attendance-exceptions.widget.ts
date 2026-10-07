import { Injectable } from "@nestjs/common";
import { todayDateString } from "../../../../../shared/utils/date-format";
import type { DashboardWidgetProvider } from "../../application/interfaces/dashboard-widget-provider.interface";
import type { DashboardContext } from "../../application/interfaces/dashboard-context.interface";
import { AttendanceAggregateService } from "../../infrastructure/repositories/attendance-aggregate.service";

export interface ExceptionItem {
  type: string;
  count: number;
}

export interface AttendanceExceptionsData {
  total: number;
  items: ExceptionItem[];
}

@Injectable()
export class AttendanceExceptionsWidgetProvider
  implements DashboardWidgetProvider<AttendanceExceptionsData>
{
  constructor(
    private readonly attendance: AttendanceAggregateService,
  ) {}

  supports(_ctx: DashboardContext): boolean {
    return true;
  }

  async execute(_ctx: DashboardContext): Promise<AttendanceExceptionsData> {
    const today = todayDateString();
    const rows = await this.attendance.getExceptionSummary(today, today);
    const total = rows.reduce((sum, r) => sum + r.pending, 0);

    return {
      total,
      items: rows
        .filter((r) => r.pending > 0)
        .map((r) => ({ type: r.type, count: r.pending })),
    };
  }
}
