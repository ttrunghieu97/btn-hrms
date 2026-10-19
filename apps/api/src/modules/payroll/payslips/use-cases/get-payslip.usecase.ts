import { Injectable } from "@nestjs/common";
import { PayslipsRepository } from "../repositories/payslips.repository";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { PayslipMapper } from "../mappers/payslip.mapper";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { DataScope } from "../../../../core/security/types/data-scope.interface";

@Injectable()
export class GetPayslipUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly payslipsRepo: PayslipsRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, GetPayslipUseCase.name);
  }

  async execute(id: string, scope?: DataScope) {
    const row = await this.payslipsRepo.findById(id);
    if (!row) {
      throwNotFound("Payslip not found", ERROR_CODES.PAYROLL_NOT_FOUND, {
        payslipId: id,
      });
    }
    const dto = PayslipMapper.toResponseDto(
      row as Parameters<typeof PayslipMapper.toResponseDto>[0],
    );
    if (scope?.tier === "self" && (row.status !== "published" || dto.isProvisional)) {
      throwNotFound("Payslip not found", ERROR_CODES.PAYROLL_NOT_FOUND, {
        payslipId: id,
      });
    }
    return dto;
  }
}







