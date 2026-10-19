import { Injectable } from "@nestjs/common";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { AttendanceSummaryReadService } from "../read-model/attendance-summary-read.service";
import { AttendanceSummaryMapper } from "../mappers/attendance-summary.mapper";
import { AttendanceSummaryQueryDto } from "../dto/attendance-summary-query.dto";
import { QueryScopeService } from "../../../../core/security/query-scope.service";
import { AuthUser } from "../../../../core/security/types/auth-user.interface";

@Injectable()
export class ListAttendanceSummariesUseCase {
  constructor(
    private readonly readService: AttendanceSummaryReadService,
    private readonly queryScope?: QueryScopeService,
  ) {}
  async execute(query: AttendanceSummaryQueryDto, user?: AuthUser) {
    const scope =
      user && this.queryScope
        ? this.queryScope.resolveScope(user, "attendance")
        : undefined;
    const result = await this.readService.list({
      employeeId: query.employeeId,
      status: query.status,
      page: query.page,
      limit: query.limit,
      scope,
    });
    return { ...result, rows: result.rows.map(AttendanceSummaryMapper.toDto) };
  }
}

@Injectable()
export class GetAttendanceSummaryUseCase {
  constructor(private readonly readService: AttendanceSummaryReadService) {}
  async execute(id: string) {
    const row = await this.readService.getById(id);
    if (!row)
      throwNotFound(
        "Attendance summary not found",
        ERROR_CODES.INVALID_REQUEST,
        { attendanceSummaryId: id },
      );
    return AttendanceSummaryMapper.toDto(row);
  }
}



