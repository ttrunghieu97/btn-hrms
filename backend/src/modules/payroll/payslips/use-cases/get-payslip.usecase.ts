import { Injectable } from "@nestjs/common";
import { PayslipsRepository } from "../repositories/payslips.repository";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { PayslipMapper } from "../mappers/payslip.mapper";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class GetPayslipUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly payslipsRepo: PayslipsRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, GetPayslipUseCase.name);
  }

  async execute(id: string) {
    const row = await this.payslipsRepo.findById(id);
    if (!row) {
      throwNotFound("Payslip not found", ERROR_CODES.PAYROLL_NOT_FOUND, {
        payslipId: id,
      });
    }
    return PayslipMapper.toResponseDto(row as Parameters<typeof PayslipMapper.toResponseDto>[0]);
  }
}







