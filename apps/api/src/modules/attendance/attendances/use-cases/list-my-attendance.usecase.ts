import { Injectable } from "@nestjs/common";
import { todayDateString } from "../../../../shared/utils/date-format";
import { AttendanceQueryDto } from "../dto/attendance-query.dto";
import { buildPaginatedResponse } from "../../../../shared/utils/pagination.util";
import { AttendanceMapper } from "../mappers/attendance.mapper";
import { AttendancesRepository } from "../repositories/attendances.repository";
import { AttendanceSessionRepository } from "../repositories/attendance-session.repository";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

function parseTimeMinutes(timeStr: string | null): number | null {
  if (!timeStr) return null;
  const match = /^(\d{2}):(\d{2})$/.exec(timeStr);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

@Injectable()
export class ListMyAttendanceUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly attendancesRepo: AttendancesRepository,
    private readonly sessionRepo: AttendanceSessionRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, ListMyAttendanceUseCase.name);
  }

  async execute(employeeId: string, query: AttendanceQueryDto) {
    const { rows, total, page, limit } =
      await this.attendancesRepo.findMyAttendancePaginated(employeeId, query);

    // Calculate start & end date of the month for session query
    const month = query.month || new Date().toISOString().slice(0, 7); // e.g. "2026-07"
    const startDay = `${month}-01`;
    const year = Number(month.split("-")[0]);
    const monthIdx = Number(month.split("-")[1]);
    const endDayDate = new Date(year, monthIdx, 0);
    const endDay = `${month}-${String(endDayDate.getDate()).padStart(2, "0")}`;

    const dbSessions = await this.sessionRepo.findSessionsByDateRange(
      employeeId, startDay, endDay
    );

    let totalWorkedMinutes = 0;
    let totalOvertimeMinutes = 0;
    let completedSessions = 0;
    const workedDaysSet = new Set<string>();

    for (const s of dbSessions) {
      workedDaysSet.add(s.date);

      let workedMinutes = 0;
      if (s.actualStart && s.actualEnd) {
        workedMinutes = Math.max(0, Math.floor((s.actualEnd.getTime() - s.actualStart.getTime()) / 60000));
      }

      totalWorkedMinutes += workedMinutes;

      if (s.sessionType === "OT") {
        totalOvertimeMinutes += workedMinutes;
      } else {
        let plannedMinutes = 480; // ponytail: hardcoded 8h default, read from Assignment when module is integrated
        if (s.plannedStart && s.plannedEnd) {
          const start = parseTimeMinutes(s.plannedStart);
          const end = parseTimeMinutes(s.plannedEnd);
          if (start !== null && end !== null && end > start) {
            plannedMinutes = end - start;
          }
        }
        totalOvertimeMinutes += Math.max(0, workedMinutes - plannedMinutes);
      }

      if (s.status === "COMPLETED") {
        completedSessions++;
      }
    }

    const summary = {
      attendanceDays: workedDaysSet.size,
      workedMinutes: totalWorkedMinutes,
      overtimeMinutes: totalOvertimeMinutes,
      completedSessions,
      expectedSessions: dbSessions.length,
    };

    const paginated = buildPaginatedResponse(
      AttendanceMapper.toResponseDtos(rows as any  ),
      total,
      page,
      limit,
    );

    return {
      items: paginated.data,
      summary,
      total: paginated.meta.pagination.total,
      page: paginated.meta.pagination.page,
      limit: paginated.meta.pagination.limit,
      hasNext: paginated.meta.pagination.hasNext,
    };
  }
}



