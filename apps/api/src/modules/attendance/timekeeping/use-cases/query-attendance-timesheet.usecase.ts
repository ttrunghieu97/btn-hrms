import { Inject, Injectable } from "@nestjs/common";
import { AttendanceTimesheetQueryDto } from "../dto/attendance-timesheet-query.dto";
import { AttendanceTimekeepingRepository } from "../repositories/attendance-timekeeping.repository";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { ATTENDANCE_PAY_POLICY, AttendancePayPolicy } from "../../../../contracts";

type TimesheetRow = {
  id: string;
  employeeId: string;
  workDate: string;
  status: string | null;
  workedMinutes: number | null;
  payableMinutes: number | null;
  scheduledMinutes: number | null;
  breakMinutes: number | null;
  lateMinutes: number | null;
  earlyLeaveMinutes: number | null;
  overtimeMinutes: number | null;
  isHoliday: boolean | null;
  exceptions?: { status: string }[];
};

@Injectable()
export class QueryAttendanceTimesheetUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly repo: AttendanceTimekeepingRepository,
    private readonly requestContext: RequestContextService,
    @Inject(ATTENDANCE_PAY_POLICY)
    private readonly payPolicy: AttendancePayPolicy,
  ) {
    this.logger = new ContextLogger(this.requestContext, QueryAttendanceTimesheetUseCase.name);
  }

  async execute(query: AttendanceTimesheetQueryDto) {
    const { rows, total, page, limit } =
      await this.repo.listTimesheetSummaries(query);

    const data = (rows as TimesheetRow[]).map((row) => {
      const exceptions = row.exceptions ?? [];
      let exceptionState: "none" | "pending" | "resolved" | "closed" = "none";
      if (exceptions.some((ex) => ex.status === "pending")) {
        exceptionState = "pending";
      } else if (exceptions.some((ex) => ex.status === "resolved")) {
        exceptionState = "resolved";
      } else if (exceptions.some((ex) => ex.status === "closed")) {
        exceptionState = "closed";
      }

      // Adapt summary shape for policy evaluation
      const policyResult = this.payPolicy.evaluate(
        {
          employeeId: row.employeeId,
          workDate: row.workDate,
          status: row.status ?? "present",
          scheduledMinutes: Number(row.scheduledMinutes ?? 0),
          workedMinutes: Number(row.workedMinutes ?? 0),
          breakMinutes: Number(row.breakMinutes ?? 0),
          lateMinutes: Number(row.lateMinutes ?? 0),
          earlyLeaveMinutes: Number(row.earlyLeaveMinutes ?? 0),
          overtimeMinutes: Number(row.overtimeMinutes ?? 0),
          isHoliday: Boolean(row.isHoliday),
          hasOverride: false, // UI logic will merge override if queried through read service, otherwise false here.
          exceptionState,
        },
        { includeUnresolvedAsPayable: query.includeUnresolvedAsPayable },
      );

      return {
        ...row,
        hasPendingException: exceptionState === "pending",
        exceptionState,
        payableMinutes: policyResult.payableMinutes,
        payableOvertimeMinutes: policyResult.payableOvertimeMinutes,
        attendanceOutcome: policyResult.attendanceOutcome,
        blockedReasons: policyResult.blockedReasons,
      };
    });

    const totals = data.reduce(
      (acc, row) => ({
        workedMinutes: acc.workedMinutes + Number(row.workedMinutes ?? 0),
        payableMinutes: acc.payableMinutes + Number(row.payableMinutes ?? 0),
        scheduledMinutes:
          acc.scheduledMinutes + Number(row.scheduledMinutes ?? 0),
        lateMinutes: acc.lateMinutes + Number(row.lateMinutes ?? 0),
        earlyLeaveMinutes:
          acc.earlyLeaveMinutes + Number(row.earlyLeaveMinutes ?? 0),
        overtimeMinutes: acc.overtimeMinutes + Number(row.overtimeMinutes ?? 0),
      }),
      {
        workedMinutes: 0,
        payableMinutes: 0,
        scheduledMinutes: 0,
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
        overtimeMinutes: 0,
      },
    );

    return {
      data,
      meta: {
        pagination: {
          total,
          page,
          limit,
          hasNext: page * limit < total,
        },
        totals,
        policy: {
          includeUnresolvedAsPayable: query.includeUnresolvedAsPayable ?? false,
        },
      },
    };
  }
}




