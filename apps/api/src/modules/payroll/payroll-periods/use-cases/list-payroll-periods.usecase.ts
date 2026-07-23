import { Injectable } from "@nestjs/common";
import { PayrollPeriodQueryDto } from "../dto/payroll-period-query.dto";
import { PayrollPeriodsRepository } from "../repositories/payroll-periods.repository";
import { PayrollPeriodMapper } from "../mappers/payroll-period.mapper";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class ListPayrollPeriodsUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly payrollPeriodsRepo: PayrollPeriodsRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, ListPayrollPeriodsUseCase.name);
  }

  async execute(query: PayrollPeriodQueryDto) {
    const result = await this.payrollPeriodsRepo.list(query);
    return { ...result, rows: PayrollPeriodMapper.toResponseDtos(result.rows) };
  }
}



