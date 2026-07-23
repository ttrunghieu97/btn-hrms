import { Injectable } from "@nestjs/common";
import { AttendanceTimekeepingRepository } from "../repositories/attendance-timekeeping.repository";
import { AttendanceTimeCalculationService } from "../services/attendance-time-calculation.service";
import { AttendanceExceptionDetectorService } from "../services/attendance-exception-detector.service";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { throwInternalServer } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";

@Injectable()
export class RecomputeAttendanceDayUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly repo: AttendanceTimekeepingRepository,
    private readonly calculator: AttendanceTimeCalculationService,
    private readonly exceptionDetector: AttendanceExceptionDetectorService,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, RecomputeAttendanceDayUseCase.name);
  }

  async execute(
    employeeId: string,
    workDate: string,
    options?: { graceMinutes?: number },
  ) {
    const graceMinutes = options?.graceMinutes ?? 15;

    const events = await this.repo.findClockEventsByEmployeeDay(
      employeeId,
      workDate,
    );
    const shiftAssignment = await this.repo.findShiftAssignmentForEmployeeDay(
      employeeId,
      workDate,
    );

    const computed = this.calculator.compute(
      events,
      {
        shiftTemplate: shiftAssignment?.shiftTemplate,
        employeeShiftAssignmentId: shiftAssignment?.id ?? null,
      },
      graceMinutes,
      workDate,
    );

    const exceptionTypes = this.exceptionDetector.detect({
      hasCheckIn: events.some((event) => event.type === "check_in"),
      hasCheckOut: events.some((event) => event.type === "check_out"),
      invalidSequence: computed.anomalyFlags.invalidSequence,
      hasShiftAssignment: Boolean(shiftAssignment),
    });

    const result = await this.repo.transaction(async () => {
      const summary = await this.repo.upsertAttendanceSummary(
        employeeId,
        workDate,
        {
          employeeShiftAssignmentId: shiftAssignment?.id ?? null,
          status: computed.status,
          scheduledMinutes: computed.scheduledMinutes,
          workedMinutes: computed.workedMinutes,
          breakMinutes: computed.breakMinutes,
          lateMinutes: computed.lateMinutes,
          earlyLeaveMinutes: computed.earlyLeaveMinutes,
          overtimeMinutes: computed.overtimeMinutes,
          anomalyFlags: {
            ...computed.anomalyFlags,
            exceptionTypes,
          },
          sourceData: computed.sourceData,
        },
      );

      if (!summary) {
        throwInternalServer("Failed to upsert attendance summary", ERROR_CODES.INTERNAL_ERROR);
      }

      const exceptions = await this.repo.replaceExceptionsForEmployeeDay(
        employeeId,
        workDate,
        summary.id,
        exceptionTypes,
        events.map((event) => event.id),
      );

      return { summary, exceptions };
    });

    return result;
  }
}



