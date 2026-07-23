import { Injectable } from "@nestjs/common";
import { DataScope } from "../../../../core/security/types/data-scope.interface";
import { OvertimeQueryDto } from "../dto/overtime.dto";
import { OvertimeMapper } from "../mappers/overtime.mapper";
import { OvertimeRepository } from "../repositories/overtime.repository";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class ListOvertimeRequestsUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly repo: OvertimeRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, ListOvertimeRequestsUseCase.name);
  }

  async execute(query: OvertimeQueryDto, scope?: DataScope) {
    const rows = await this.repo.findMany(query, scope);
    return rows.map(OvertimeMapper.toDto);
  }
}



