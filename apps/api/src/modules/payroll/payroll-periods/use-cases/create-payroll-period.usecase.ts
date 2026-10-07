import { Injectable } from "@nestjs/common";
import { CreatePayrollPeriodDto } from "../dto/create-payroll-period.dto";
import { PayrollPeriodsRepository } from "../repositories/payroll-periods.repository";
import { PayrollPeriodMapper } from "../mappers/payroll-period.mapper";
import { throwBadRequest } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class CreatePayrollPeriodUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly payrollPeriodsRepo: PayrollPeriodsRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, CreatePayrollPeriodUseCase.name);
  }

  async execute(dto: CreatePayrollPeriodDto) {
    if (dto.startsOn > dto.endsOn) {
      throwBadRequest(
        "Invalid payroll period date range",
        ERROR_CODES.INVALID_REQUEST,
        { startsOn: dto.startsOn, endsOn: dto.endsOn },
      );
    }

    const created = await this.payrollPeriodsRepo.create({
      code: dto.code,
      name: dto.name,
      startsOn: dto.startsOn,
      endsOn: dto.endsOn,
      status: (dto.status ?? "draft") as "draft" | "open" | "closed" | "processing" | "paid",
    });

    const row = await this.payrollPeriodsRepo.findById(created!.id);
    return PayrollPeriodMapper.toResponseDto(row!);
  }
}



