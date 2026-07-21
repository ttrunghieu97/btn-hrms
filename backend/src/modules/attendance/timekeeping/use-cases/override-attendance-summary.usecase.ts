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

    const hasOverrideField =
      dto.overriddenStatus != null ||
      dto.overriddenWorkedMinutes != null ||
      dto.overriddenLateMinutes != null ||
      dto.overriddenEarlyLeaveMinutes != null ||
      dto.overriddenOvertimeMinutes != null;

    if (!hasOverrideField) {
      throwBadRequest(
        "At least one override field must be provided",
        ERROR_CODES.INVALID_REQUEST,
      );
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

    return { id: created!.id, employeeId: dto.employeeId, workDate: dto.workDate, action: "created" };
  }
}