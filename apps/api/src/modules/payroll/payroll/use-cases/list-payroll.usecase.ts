import { Injectable } from "@nestjs/common";
import { buildPaginatedResponse } from "../../../../shared/utils/pagination.util";
import { PayrollMapper } from "../mappers/payroll.mapper";
import { PayrollQueryDto } from "../dto/payroll-query.dto";
import { PayrollRepository } from "../repositories/payroll.repository";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class ListPayrollUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly payrollRepo: PayrollRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, ListPayrollUseCase.name);
  }

  async execute(query: PayrollQueryDto) {
    const { rows, total, page, limit } = await this.payrollRepo.list(query);
    return buildPaginatedResponse(
      PayrollMapper.toResponseDtos(rows as any /* eslint-disable-line @typescript-eslint/no-explicit-any */),
      total,
      page,
      limit,
    );
  }
}



