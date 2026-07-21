import type { ScheduleRequestWithEmployee } from "../repositories/schedule-requests.repository.contract";
import { type ScheduleRequestResponseDto } from "../dto/schedule-request-response.dto";

function employeeName(row: ScheduleRequestWithEmployee): string {
  const e = row.employee;
  if (!e) return row.employeeId;
  return `${e.firstName} ${e.lastName}`.trim() || e.employeeCode || row.employeeId;
}

export function mapScheduleRequestToDto(
  row: ScheduleRequestWithEmployee
): ScheduleRequestResponseDto {
  return {
    id: row.id,
    employeeId: row.employeeId,
    employeeName: employeeName(row),
    date: typeof row.date === "string" ? row.date : String(row.date),
    requestType: row.requestType,
    reason: row.reason ?? undefined,
    status: row.status,
    reviewedBy: row.reviewedBy ?? undefined,
    reviewedAt: row.reviewedAt?.toISOString?.() ?? undefined,
    createdAt: row.createdAt?.toISOString?.() ?? String(row.createdAt),
  };
}
