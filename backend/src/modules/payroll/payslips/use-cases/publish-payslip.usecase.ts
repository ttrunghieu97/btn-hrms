import { Injectable } from "@nestjs/common";
import { PayslipsRepository } from "../repositories/payslips.repository";
import { PublishPayslipDto } from "../dto/publish-payslip.dto";
import {
  throwConflict,
  throwNotFound,
} from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { PayslipMapper } from "../mappers/payslip.mapper";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { PayslipPublishedEvent } from "../../../../core/events/events/payslip-published.event";

@Injectable()
export class PublishPayslipUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly payslipsRepo: PayslipsRepository,
    private readonly requestContext: RequestContextService,
    private readonly eventOutbox: EventOutboxService,
  ) {
    this.logger = new ContextLogger(this.requestContext, PublishPayslipUseCase.name);
  }

  async execute(id: string, dto: PublishPayslipDto) {
    const existing = await this.payslipsRepo.findById(id);
    if (!existing) {
      throwNotFound("Payslip not found", ERROR_CODES.PAYROLL_NOT_FOUND, {
        payslipId: id,
      });
    }
    if (existing.status === "voided") {
      throwConflict(
        "Voided payslip cannot be published",
        ERROR_CODES.INVALID_STATUS_TRANSITION,
        { payslipId: id },
      );
    }

    await this.payslipsRepo.transaction(async (tx) => {
      await this.payslipsRepo.update(id, {
        status: (dto.status ?? "published") as "published",
        publishedAt: new Date(),
        metadata: dto.note
          ? {
              ...(existing.metadata ?? {}),
              note: dto.note,
            }
          : existing.metadata,
      }, tx);

      await this.eventOutbox.stage(
        new PayslipPublishedEvent({
          payslipId: id,
          employeeId: existing.employeeId,
          payrollRunId: existing.payrollRunId ?? null,
        }),
        tx,
      );
    });

    return PayslipMapper.toResponseDto((await this.payslipsRepo.findById(id))! as Parameters<typeof PayslipMapper.toResponseDto>[0]);
  }
}







