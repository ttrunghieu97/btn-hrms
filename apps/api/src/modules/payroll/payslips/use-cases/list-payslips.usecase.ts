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
    const filteredRows =
      scope?.tier === "self"
        ? (result.rows ?? []).filter(
            (row: { status?: string }) =>
              !row.status || row.status === "published",
          )
        : result.rows;
    return {
      ...result,
      rows: PayslipMapper.toResponseDtos(filteredRows as any),
      total:
        scope?.tier === "self" && filteredRows.length !== (result.rows ?? []).length
          ? filteredRows.length
          : result.total,
    };
  }
}



