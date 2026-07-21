import { formatDateISO } from "@/shared/utils/date-format";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { IAttendanceSummaryWriterPort, ATTENDANCE_SUMMARY_WRITER_PORT } from "../../../../contracts/ports/attendance-summary-writer.port";
import { IAttendanceSummariesReader, ATTENDANCE_SUMMARIES_READER } from "../../../../contracts/ports/attendance-summaries-reader.port";

@Injectable()
export class LeaveAttendanceReconciliationService {
  private readonly logger = new Logger(
    LeaveAttendanceReconciliationService.name,
  );

  constructor(
    @Inject(ATTENDANCE_SUMMARY_WRITER_PORT)
    private readonly attendanceSummaryWriter: IAttendanceSummaryWriterPort,
    @Inject(ATTENDANCE_SUMMARIES_READER)
    private readonly attendanceSummariesReader: IAttendanceSummariesReader,
  ) {}

  async reconcileApprovedLeave(request: {
    id: string;
    employeeId: string;
    startDate: string;
    endDate: string;
    updatedAt?: Date | null;
  }) {
    const dates = this.enumerateDates(request.startDate, request.endDate);
    const key = this.buildReconciliationKey(request, "approved");

    const existingSummaries = await this.attendanceSummariesReader.findByEmployeeAndDates(
      request.employeeId,
      dates,
    ) as { workDate: string; sourceData: unknown; workedMinutes: number | null; status: string }[];
    const summaryMap = new Map(existingSummaries.map(s => [s.workDate, s]));

    for (const workDate of dates) {
      const existing = summaryMap.get(workDate);

      if (this.isAlreadyApplied(existing?.sourceData, key)) {
        continue;
      }

      const shouldKeepWorkedStatus = (existing?.workedMinutes ?? 0) > 0;
      const status = existing && shouldKeepWorkedStatus ? existing.status : "leave";

      await this.attendanceSummaryWriter.upsertFromLeave(
        request.employeeId,
        workDate,
        status,
        request.id,
      );
    }

    this.logger.log(
      `Reconciled approved leave request ${request.id} for ${dates.length} day(s)`,
    );
  }

  async reconcileCanceledLeave(request: {
    id: string;
    updatedAt?: Date | null;
  }) {
    const summaries = await this.attendanceSummariesReader.findByLeaveRequestId(
      request.id,
    ) as { employeeId: string; workDate: string; sourceData: unknown; workedMinutes: number | null; status: string }[];
    const key = this.buildReconciliationKey(request, "cancelled");

    for (const summary of summaries) {
      if (this.isAlreadyApplied(summary.sourceData, key)) {
        continue;
      }

      const hasWorkedMinutes = (summary.workedMinutes ?? 0) > 0;
      const status = hasWorkedMinutes ? summary.status : "absent";

      await this.attendanceSummaryWriter.upsertFromLeave(
        summary.employeeId,
        summary.workDate,
        status,
        null,
      );
    }

    this.logger.log(
      `Reconciled canceled leave request ${request.id} for ${summaries.length} day(s)`,
    );
  }

  private enumerateDates(startDate: string, endDate: string) {
    const result: string[] = [];

    const current = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T00:00:00.000Z`);

    while (current.getTime() <= end.getTime()) {
      result.push(formatDateISO(current));
      current.setUTCDate(current.getUTCDate() + 1);
    }

    return result;
  }

  private buildReconciliationKey(
    request: { id: string; updatedAt?: Date | null },
    mode: "approved" | "cancelled",
  ) {
    const version = request.updatedAt?.toISOString() ?? "v1";
    return `${request.id}:${mode}:${version}`;
  }

  private isAlreadyApplied(sourceData: any  , key: string) {
    const source = this.toObject(sourceData);
    const reconciliation = source?.leaveReconciliation as
      | { key?: string }
      | undefined;
    return reconciliation?.key === key;
  }

  private toObject(value: Record<string, unknown>  ): Record<string, unknown>   | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }
    return value  ;
  }
}





