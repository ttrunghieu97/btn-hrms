import { Injectable } from "@nestjs/common";
import { AttendanceTimekeepingRepository } from "../repositories/attendance-timekeeping.repository";
import { OverrideAttendanceSummaryDto } from "../dto/override-attendance-summary.dto";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { throwBadRequest } from "../../../../shared/utils/http-error";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class OverrideAttendanceSummaryUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly repo: AttendanceTimekeepingRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, OverrideAttendanceSummaryUseCase.name);
  }

  async execute(actorUserId: string, dto: OverrideAttendanceSummaryDto) {
    const exists = await this.repo.employeeExists(dto.employeeId);
    if (!exists) {
      throwBadRequest("Employee not found", ERROR_CODES.INVALID_REQUEST, {
        employeeId: dto.employeeId,
      });
    }

    const period = dto.workDate.slice(0, 7);
    const periodLock = await this.repo.findPeriodLock(period);
    if (periodLock && (periodLock.status === "locked" || periodLock.status === "payroll_processing" || periodLock.status === "payroll_posted" || periodLock.status === "closed")) {
      throwBadRequest(
        `Period ${period} is locked/closed — timesheet corrections not allowed`,
        ERROR_CODES.INVALID_REQUEST,
        { period, status: periodLock.status },
      );
    }

    const hasOverrideField =
      dto.overriddenStatus != null ||
      dto.overriddenWorkedMinutes != null ||
      dto.overriddenLateMinutes != null ||
      dto.overriddenEarlyLeaveMinutes != null ||
      dto.overriddenOvertimeMinutes != null ||
      dto.note != null ||
      dto.checkInMorning !== undefined ||
      dto.checkOutMorning !== undefined ||
      dto.checkInAfternoon !== undefined ||
      dto.checkOutAfternoon !== undefined ||
      dto.breakMinutes !== undefined ||
      dto.personalBreakMinutes !== undefined ||
      dto.lunchDutyMinutes !== undefined ||
      dto.duty30kMinutes !== undefined ||
      dto.nightShiftDutyCount !== undefined ||
      dto.waterBoothDutyCount !== undefined;

    if (!hasOverrideField) {
      throwBadRequest(
        "At least one override field must be provided",
        ERROR_CODES.INVALID_REQUEST,
      );
    }

    // 1. Synchronize clock events if punch times were modified
    if (dto.checkInMorning !== undefined) {
      await this.repo.upsertSessionClockEvent({
        employeeId: dto.employeeId,
        workDate: dto.workDate,
        session: "morning",
        type: "check_in",
        timeStr: dto.checkInMorning,
      });
    }
    if (dto.checkOutMorning !== undefined) {
      await this.repo.upsertSessionClockEvent({
        employeeId: dto.employeeId,
        workDate: dto.workDate,
        session: "morning",
        type: "check_out",
        timeStr: dto.checkOutMorning,
      });
    }
    if (dto.checkInAfternoon !== undefined) {
      await this.repo.upsertSessionClockEvent({
        employeeId: dto.employeeId,
        workDate: dto.workDate,
        session: "afternoon",
        type: "check_in",
        timeStr: dto.checkInAfternoon,
      });
    }
    if (dto.checkOutAfternoon !== undefined) {
      await this.repo.upsertSessionClockEvent({
        employeeId: dto.employeeId,
        workDate: dto.workDate,
        session: "afternoon",
        type: "check_out",
        timeStr: dto.checkOutAfternoon,
      });
    }

    // 2. Synchronize daily summary row
    const summaryUpdates: Record<string, unknown> = {};
    if (dto.overriddenWorkedMinutes !== undefined) summaryUpdates.workedMinutes = dto.overriddenWorkedMinutes;
    if (dto.overriddenOvertimeMinutes !== undefined) summaryUpdates.overtimeMinutes = dto.overriddenOvertimeMinutes;
    if (dto.overriddenLateMinutes !== undefined) summaryUpdates.lateMinutes = dto.overriddenLateMinutes;
    if (dto.overriddenEarlyLeaveMinutes !== undefined) summaryUpdates.earlyLeaveMinutes = dto.overriddenEarlyLeaveMinutes;
    if (dto.overriddenStatus !== undefined) summaryUpdates.status = dto.overriddenStatus;
    if (dto.breakMinutes !== undefined) summaryUpdates.breakMinutes = dto.breakMinutes;
    if (dto.personalBreakMinutes !== undefined) summaryUpdates.personalBreakMinutes = dto.personalBreakMinutes;
    if (dto.lunchDutyMinutes !== undefined) summaryUpdates.lunchDutyMinutes = dto.lunchDutyMinutes;
    if (dto.nightShiftDutyCount !== undefined) summaryUpdates.nightShiftDutyCount = String(dto.nightShiftDutyCount ?? 0);
    if (dto.waterBoothDutyCount !== undefined) summaryUpdates.waterBoothDutyCount = String(dto.waterBoothDutyCount ?? 0);

    if (Object.keys(summaryUpdates).length > 0) {
      await this.repo.upsertAttendanceSummary(dto.employeeId, dto.workDate, summaryUpdates as any);
    }

    const existing = await this.repo.findOverride(dto.employeeId, dto.workDate);

    if (existing) {
      const updated = await this.repo.updateOverride(existing.id, {
        reason: dto.reason,
        note: dto.note,
        overriddenStatus: dto.overriddenStatus ?? existing.overriddenStatus,
        overriddenWorkedMinutes: dto.overriddenWorkedMinutes ?? existing.overriddenWorkedMinutes,
        overriddenLateMinutes: dto.overriddenLateMinutes ?? existing.overriddenLateMinutes,
        overriddenEarlyLeaveMinutes: dto.overriddenEarlyLeaveMinutes ?? existing.overriddenEarlyLeaveMinutes,
        overriddenOvertimeMinutes: dto.overriddenOvertimeMinutes ?? existing.overriddenOvertimeMinutes,
        createdByUserId: actorUserId,
      });
      this.logger.log({
        event: "timesheet_correction_updated",
        period,
        employeeId: dto.employeeId,
        actorUserId,
        workDate: dto.workDate,
        reason: dto.reason,
        action: "updated",
      });
      return { id: updated!.id, employeeId: dto.employeeId, workDate: dto.workDate, action: "updated" };
    }

    const created = await this.repo.insertOverride({
      employeeId: dto.employeeId,
      workDate: dto.workDate,
      reason: dto.reason,
      note: dto.note,
      overriddenStatus: dto.overriddenStatus,
      overriddenWorkedMinutes: dto.overriddenWorkedMinutes,
      overriddenLateMinutes: dto.overriddenLateMinutes,
      overriddenEarlyLeaveMinutes: dto.overriddenEarlyLeaveMinutes,
      overriddenOvertimeMinutes: dto.overriddenOvertimeMinutes,
      createdByUserId: actorUserId,
    });

    this.logger.log({
      event: "timesheet_correction_created",
      period,
      employeeId: dto.employeeId,
      actorUserId,
      workDate: dto.workDate,
      reason: dto.reason,
      action: "created",
    });

    return { id: created!.id, employeeId: dto.employeeId, workDate: dto.workDate, action: "created" };
  }
}