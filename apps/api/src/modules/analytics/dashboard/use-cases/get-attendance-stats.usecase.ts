import { Injectable } from "@nestjs/common";
import { todayDateString } from "../../../../shared/utils/date-format";
import { AttendanceAggregateService } from "../infrastructure/repositories/attendance-aggregate.service";
import { WorkforceAggregateService } from "../infrastructure/repositories/workforce-aggregate.service";

export interface AttendanceStatsResult {
  summary: {
    attendanceRate: number;
    presentToday: number;
    totalEmployees: number;
    pendingExceptions: number;
    avgWorkedHours: number;
  };
  dailyTrend: Array<{
    date: string;
    present: number;
    late: number;
    absent: number;
  }>;
  departmentRates: Array<{
    departmentName: string;
    attendanceRate: number;
    totalEmployees: number;
  }>;
  exceptionSummary: Array<{
    type: string;
    count: number;
    pending: number;
    resolved: number;
  }>;
  overtimeBreakdown: {
    approvedMinutes: number;
    pendingMinutes: number;
    employeeCount: number;
  };
}

@Injectable()
export class GetAttendanceStatsUseCase {
  constructor(
    private readonly attendance: AttendanceAggregateService,
    private readonly workforce: WorkforceAggregateService,
  ) {}

  async execute(month?: string): Promise<AttendanceStatsResult> {
    const now = new Date();
    let year = now.getFullYear();
    let monthNum = now.getMonth() + 1;

    if (month && /^\d{4}-\d{2}$/.test(month.trim())) {
      const [yStr, mStr] = month.trim().split("-");
      const parsedYear = Number(yStr);
      const parsedMonth = Number(mStr);
      if (parsedYear >= 2000 && parsedMonth >= 1 && parsedMonth <= 12) {
        year = parsedYear;
        monthNum = parsedMonth;
      }
    }

    const mm = String(monthNum).padStart(2, "0");
    const from = `${year}-${mm}-01`;
    const lastDay = new Date(year, monthNum, 0).getDate();
    const to = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;
    const nextYear = monthNum === 12 ? year + 1 : year;
    const nextMonth = monthNum === 12 ? 1 : monthNum + 1;
    const nextMonthStart = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
    const todayStr = todayDateString();

    const [
      todaySummary,
      snapshot,
      deptHeadcounts,
      dailyTrend,
      exceptionSummary,
      overtimeBreakdown,
      periodMetrics,
      deptMetrics,
    ] = await Promise.all([
      this.attendance.getTodaySummary(todayStr),
      this.workforce.getSnapshot(),
      this.workforce.getDepartmentHeadcounts(),
      this.attendance.getAttendanceTrend(from, nextMonthStart),
      this.attendance.getExceptionSummary(from, to),
      this.attendance.getOvertimeSummary(year, monthNum),
      typeof this.attendance.getPeriodMetrics === "function"
        ? this.attendance.getPeriodMetrics(from, to)
        : Promise.resolve({ presentRecords: 0, totalRecords: 0, avgWorkedMinutes: 0 }),
      typeof this.attendance.getDepartmentAttendanceMetrics === "function"
        ? this.attendance.getDepartmentAttendanceMetrics(from, to)
        : Promise.resolve([]),
    ]);

    const totalEmployees = snapshot.activeEmployees || snapshot.totalEmployees || 0;
    const presentToday = Math.max(todaySummary.presentCount, todaySummary.totalCheckIns);
    const fallbackRate =
      totalEmployees > 0
        ? Math.min(100, Math.round((presentToday / totalEmployees) * 100))
        : 0;
    const attendanceRate =
      periodMetrics.totalRecords > 0
        ? Math.min(
            100,
            Math.round((periodMetrics.presentRecords / periodMetrics.totalRecords) * 100),
          )
        : fallbackRate;
    const pendingExceptions = exceptionSummary.reduce(
      (sum, item) => sum + item.pending,
      0,
    );
    const avgWorkedHours =
      periodMetrics.avgWorkedMinutes > 0
        ? Math.round((periodMetrics.avgWorkedMinutes / 60) * 10) / 10
        : presentToday > 0 || dailyTrend.length > 0
          ? 8
          : 0;

    const deptMetricMap = new Map(
      deptMetrics.map((m) => [m.departmentId, m]),
    );

    const departmentRates = deptHeadcounts.map((dept) => {
      const m = deptMetricMap.get(dept.departmentId);
      const deptRate =
        m && m.totalRecords > 0
          ? Math.min(100, Math.round((m.presentRecords / m.totalRecords) * 100))
          : 0;
      return {
        departmentName: dept.departmentName,
        totalEmployees: dept.count,
        attendanceRate: dept.count > 0 ? deptRate : 0,
      };
    });

    return {
      summary: {
        attendanceRate,
        presentToday,
        totalEmployees,
        pendingExceptions,
        avgWorkedHours,
      },
      dailyTrend: dailyTrend.map((row) => ({
        date: row.date,
        present: row.present,
        late: row.late,
        absent: row.absent,
      })),
      departmentRates,
      exceptionSummary,
      overtimeBreakdown,
    };
  }
}
