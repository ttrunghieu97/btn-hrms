import { Injectable } from "@nestjs/common";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ResolveAttendanceExceptionDto } from "../dto/resolve-attendance-exception.dto";
import { AttendanceTimekeepingRepository } from "../repositories/attendance-timekeeping.repository";
import { RecomputeAttendanceDayUseCase } from "./recompute-attendance-day.usecase";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class ResolveAttendanceExceptionUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly repo: AttendanceTimekeepingRepository,
    private readonly recomputeAttendanceDay: RecomputeAttendanceDayUseCase,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, ResolveAttendanceExceptionUseCase.name);
  }

  async execute(
    id: string,
    actorUserId: string,
    dto: ResolveAttendanceExceptionDto,
  ) {
    const existing = await this.repo.getExceptionById(id);
    if (!existing) {
      throwNotFound(
        "Attendance exception not found",
        ERROR_CODES.INVALID_REQUEST,
        {
          attendanceExceptionId: id,
        },
      );
    }

    const result = await this.repo.transaction(async () => {
      const resolved = await this.repo.resolveException(id, {
        status: dto.status ?? "resolved",
        resolutionNote: dto.note,
        resolvedByUserId: actorUserId,
        resolvedAt: new Date(),
      });

      const recomputed = await this.recomputeAttendanceDay.execute(
        existing.employeeId,
        existing.workDate,
      );

      return {
        exception: resolved,
        summary: recomputed.summary,
        pendingExceptions: recomputed.exceptions,
      };
    });

    return result;
  }
}



