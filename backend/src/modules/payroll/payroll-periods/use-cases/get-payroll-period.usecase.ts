import { Injectable } from "@nestjs/common";
import { PayrollPeriodsRepository } from "../repositories/payroll-periods.repository";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { PayrollPeriodMapper } from "../mappers/payroll-period.mapper";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class GetPayrollPeriodUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly payrollPeriodsRepo: PayrollPeriodsRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, GetPayrollPeriodUseCase.name);
  }

  async execute(id: string) {
    const row = await this.payrollPeriodsRepo.findById(id);
    if (!row) {
      throwNotFound("Payroll period not found", ERROR_CODES.PAYROLL_NOT_FOUND, {
        payrollPeriodId: id,
      });
    }
    return PayrollPeriodMapper.toResponseDto(row);
  }
}



