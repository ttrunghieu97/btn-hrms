import { formatDateISO } from "@/shared/utils/date-format";
import { Injectable } from "@nestjs/common";
import { calculateScheduledMinutes } from "../../shift-catalog/services/shift-time.validator";

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function formatDate(date: Date): string {
  return formatDateISO(date);
}

function nextDate(date: Date): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

@Injectable()
export class RosterExpansionService {
  expand(rows: any[], from: string, to: string): any[] {
    const fromDate = new Date(`${from}T00:00:00.000Z`);
    const toDate = new Date(`${to}T00:00:00.000Z`);

    return rows.flatMap((row) => {
      const template = row.shiftTemplate;
      if (!template) return [];

      const start = new Date(
        `${(row.effectiveFrom ?? row.assignmentDate) as string}T00:00:00.000Z`,
      );
      const end = row.effectiveTo
        ? new Date(`${row.effectiveTo}T00:00:00.000Z`)
        : toDate;

      const rangeStart = start > fromDate ? start : fromDate;
      const rangeEnd = end < toDate ? end : toDate;
      if (rangeEnd < rangeStart) return [];

      const activeWeekdays = Array.isArray(template.workDays)
        ? template.workDays.map((d: string) => String(d).toLowerCase())
        : null;

      const expanded: any[] = [];
      let cursor = new Date(rangeStart);
      while (cursor <= rangeEnd) {
        const weekday = WEEKDAYS[cursor.getUTCDay()];
        if (!activeWeekdays || activeWeekdays.includes(weekday)) {
          expanded.push({
            employeeId: row.employeeId,
            employeeName: row.employee
              ? `${row.employee.firstName} ${row.employee.lastName}`.trim()
              : null,
            departmentId: row.employee?.departmentId ?? null,
            shiftTemplateId: row.shiftTemplateId,
            shiftTemplateCode: template.code,
            shiftTemplateName: template.name,
            workDate: formatDate(cursor),
            startTime: template.startTime,
            endTime: template.endTime,
            overnight: template.isNightShift,
            breakMinutes: template.breakMinutes,
            scheduledMinutes: calculateScheduledMinutes({
              startTime: template.startTime,
              endTime: template.endTime,
              overnight: template.isNightShift,
              breakMinutes: template.breakMinutes,
            }),
            assignmentId: row.id,
            assignmentStatus: row.status,
          });
        }
        cursor = nextDate(cursor);
      }

      return expanded;
    });
  }
}



