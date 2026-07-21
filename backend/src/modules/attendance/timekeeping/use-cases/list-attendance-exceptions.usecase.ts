import { Injectable } from "@nestjs/common";
import { buildPaginatedResponse } from "../../../../shared/utils/pagination.util";
import { AttendanceExceptionQueryDto } from "../dto/attendance-exception-query.dto";
import { AttendanceTimekeepingRepository } from "../repositories/attendance-timekeeping.repository";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class ListAttendanceExceptionsUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly repo: AttendanceTimekeepingRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, ListAttendanceExceptionsUseCase.name);
  }

  async execute(query: AttendanceExceptionQueryDto) {
    const { rows, total, page, limit } = await this.repo.listExceptions(query);
    return buildPaginatedResponse(rows, total, page, limit);
  }
}



