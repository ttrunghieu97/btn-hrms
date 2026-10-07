import { Injectable } from "@nestjs/common";
import { UpdatePayrollPeriodDto } from "../dto/update-payroll-period.dto";
import { PayrollPeriodsRepository } from "../repositories/payroll-periods.repository";
import { PayrollPeriodMapper } from "../mappers/payroll-period.mapper";
import {
  throwBadRequest,
  throwNotFound,
} from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class UpdatePayrollPeriodUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly payrollPeriodsRepo: PayrollPeriodsRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, UpdatePayrollPeriodUseCase.name);
  }

  async execute(id: string, dto: UpdatePayrollPeriodDto) {
    const existing = await this.payrollPeriodsRepo.findById(id);
    if (!existing) {
      throwNotFound("Payroll period not found", ERROR_CODES.PAYROLL_NOT_FOUND, {
        payrollPeriodId: id,
      });
    }

    const startsOn = dto.startsOn ?? existing.startsOn;
    const endsOn = dto.endsOn ?? existing.endsOn;
    if (startsOn > endsOn) {
      throwBadRequest(
        "Invalid payroll period date range",
        ERROR_CODES.INVALID_REQUEST,
        { startsOn, endsOn },
      );
    }

    await this.payrollPeriodsRepo.update(id, {
      name: dto.name,
      startsOn: dto.startsOn,
      endsOn: dto.endsOn,
      status: dto.status as "draft" | "open" | "closed" | "processing" | "paid" | undefined,
    });
    const updated = await this.payrollPeriodsRepo.findById(id);
    return PayrollPeriodMapper.toResponseDto(updated!);
  }
}



