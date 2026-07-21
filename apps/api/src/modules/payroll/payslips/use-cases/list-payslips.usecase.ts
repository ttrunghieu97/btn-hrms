import { Injectable } from "@nestjs/common";
import { PayslipsRepository } from "../repositories/payslips.repository";
import { PayslipQueryDto } from "../dto/payslip-query.dto";
import { PayslipMapper } from "../mappers/payslip.mapper";
import { DataScope } from "../../../../core/security/types/data-scope.interface";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class ListPayslipsUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly payslipsRepo: PayslipsRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, ListPayslipsUseCase.name);
  }

  async execute(query: PayslipQueryDto, scope?: DataScope) {
    const result = await this.payslipsRepo.list(query, scope);
    return { ...result, rows: PayslipMapper.toResponseDtos(result.rows as any /* eslint-disable-line @typescript-eslint/no-explicit-any */) };
  }
}



