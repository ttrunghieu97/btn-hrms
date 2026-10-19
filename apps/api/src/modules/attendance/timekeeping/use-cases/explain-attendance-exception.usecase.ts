import { Injectable } from "@nestjs/common";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ERROR_REASONS } from "../../../../shared/constants/error-reasons";
import {
  throwBadRequest,
  throwForbidden,
  throwNotFound,
} from "../../../../shared/utils/http-error";
import { ExplainAttendanceExceptionDto } from "../dto/explain-attendance-exception.dto";
import { AttendanceTimekeepingRepository } from "../repositories/attendance-timekeeping.repository";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { QueryScopeService } from "../../../../core/security/query-scope.service";
import type { AuthUser } from "../../../../core/security/types/auth-user.interface";

@Injectable()
export class ExplainAttendanceExceptionUseCase {
  private readonly logger: ContextLogger;

  constructor(
    private readonly repo: AttendanceTimekeepingRepository,
    private readonly requestContext: RequestContextService,
    private readonly queryScope: QueryScopeService,
  ) {
    this.logger = new ContextLogger(
      this.requestContext,
      ExplainAttendanceExceptionUseCase.name,
    );
  }

  async execute(
    id: string,
    user: AuthUser,
    dto: ExplainAttendanceExceptionDto,
  ) {
    const existing = await this.repo.getExceptionById(id);
    if (!existing) {
      throwNotFound(
        "Attendance exception not found",
        ERROR_CODES.NOT_FOUND,
        {
          attendanceExceptionId: id,
        },
      );
    }

    const scope = this.queryScope.resolveScope(user, "attendance");
    if (
      scope.tier === "self" &&
      (!user.employeeId || String(existing.employeeId) !== String(user.employeeId))
    ) {
      throwForbidden(
        "You can only explain your own attendance exceptions",
        ERROR_CODES.FORBIDDEN,
        {
          reason: ERROR_REASONS.MISSING_PERMISSION,
          attendanceExceptionId: id,
        },
      );
    }

    if (existing.status !== "pending") {
      throwBadRequest(
        "Only pending attendance exceptions can be explained",
        ERROR_CODES.INVALID_REQUEST,
        {
          reason: ERROR_REASONS.INVALID_STATE,
          attendanceExceptionId: id,
          status: existing.status,
        },
      );
    }

    const formattedNote = `[Giải trình NV]: ${dto.note.trim()}`;
    const updated = await this.repo.updateExceptionNote(id, formattedNote);

    this.logger.log({
      event: "attendance.exception_explained",
      attendanceExceptionId: id,
      employeeId: existing.employeeId,
      userId: user.id,
    });

    return {
      exception: updated,
    };
  }
}
