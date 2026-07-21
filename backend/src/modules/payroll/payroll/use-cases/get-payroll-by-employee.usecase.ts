import { Injectable } from "@nestjs/common";
import { PayrollMapper } from "../mappers/payroll.mapper";
import { PayrollRepository } from "../repositories/payroll.repository";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class GetPayrollByEmployeeUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly payrollRepo: PayrollRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, GetPayrollByEmployeeUseCase.name);
  }

  async execute(employeeId: string) {
    const row = await this.payrollRepo.findByEmployeeId(employeeId);
    if (!row) {
      throwNotFound("Payroll not found", ERROR_CODES.PAYROLL_NOT_FOUND, {
        employeeId,
      });
    }
    return PayrollMapper.toResponseDto(row  );
  }
}



