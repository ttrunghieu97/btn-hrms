import { Injectable } from "@nestjs/common";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ResolveAttendanceExceptionDto } from "../dto/resolve-attendance-exception.dto";
import { AttendanceTimekeepingRepository } from "../repositories/attendance-timekeeping.repository";
import { RecomputeAttendanceDayUseCase } from "./recompute-attendance-day.usecase";
import { AttendanceDayTransactionService } from "../services/attendance-day-transaction.service";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class ResolveAttendanceExceptionUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly repo: AttendanceTimekeepingRepository,
    private readonly recomputeAttendanceDay: RecomputeAttendanceDayUseCase,
    private readonly dayTransaction: AttendanceDayTransactionService,
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

    const result = await this.dayTransaction.execute(
      existing.employeeId,
      existing.workDate,
      async (tx) => {
        const resolved = await this.repo.resolveException(id, {
          status: dto.status ?? "resolved",
          resolutionNote: dto.note,
          resolvedByUserId: actorUserId,
          resolvedAt: new Date(),
        }, tx);

        const recomputed = await this.recomputeAttendanceDay.execute(
          existing.employeeId,
          existing.workDate,
          { tx },
        );

        return {
          exception: resolved,
          summary: recomputed.summary,
          pendingExceptions: recomputed.exceptions,
        };
      },
    );

    return result;
  }
}



