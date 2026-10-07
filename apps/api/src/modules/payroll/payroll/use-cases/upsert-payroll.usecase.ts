import { Inject, Injectable } from "@nestjs/common";
import { PayrollMapper } from "../mappers/payroll.mapper";
import { UpsertPayrollDto } from "../dto/upsert-payroll.dto";
import { PayrollRepository } from "../repositories/payroll.repository";
import { PayrollGeneratedEvent } from "../../../../core/events/events/payroll-generated.event";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { throwInternalServer } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";

@Injectable()
export class UpsertPayrollUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly payrollRepo: PayrollRepository,
    private readonly eventOutbox: EventOutboxService,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, UpsertPayrollUseCase.name);
  }

  async execute(employeeId: string, dto: UpsertPayrollDto) {

    return this.payrollRepo.transaction(async (tx) => {
      const row = await this.payrollRepo.upsertByEmployeeId(employeeId, {
        salary: dto.salary  ,
        bonus: (dto.bonus ?? "0")  ,
        deduction: (dto.deduction ?? "0")  ,
        currency: dto.currency ?? "VND",
        effectiveFrom: dto.effectiveFrom ?? null,
      }  , tx);

      if (!row) throwInternalServer("Failed to upsert payroll record", ERROR_CODES.INTERNAL_ERROR);

      const loaded = await this.payrollRepo.findByEmployeeId(row.employeeId, tx);

      await this.eventOutbox.stage(
        new PayrollGeneratedEvent(row.employeeId, row.id),
        tx,
      );

      return PayrollMapper.toResponseDto(loaded as any  );
    });
  }
}



