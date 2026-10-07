import { Injectable } from "@nestjs/common";
import { AttendanceQueryDto } from "../dto/attendance-query.dto";
import { buildPaginatedResponse } from "../../../../shared/utils/pagination.util";
import { AttendanceMapper } from "../mappers/attendance.mapper";
import { AttendancesRepository } from "../repositories/attendances.repository";
import { DataScope } from "../../../../core/security/types/data-scope.interface";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class ListAttendancesUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly attendancesRepo: AttendancesRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, ListAttendancesUseCase.name);
  }

  async execute(query: AttendanceQueryDto, scope?: DataScope) {
    const { rows, total, page, limit } =
      await this.attendancesRepo.findAllPaginated(query, scope);

    return buildPaginatedResponse(
      AttendanceMapper.toResponseDtos(rows),
      total,
      page,
      limit,
    );
  }
}



