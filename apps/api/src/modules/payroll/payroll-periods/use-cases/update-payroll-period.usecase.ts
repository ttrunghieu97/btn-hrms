import { Injectable } from "@nestjs/common";
import { UpdatePayrollPeriodDto } from "../dto/update-payroll-period.dto";
import { PayrollPeriodsRepository } from "../repositories/payroll-periods.repository";
import { PayrollPeriodMapper } from "../mappers/payroll-period.mapper";
import {
  throwBadRequest,
  throwConflict,
  throwNotFound,
} from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import {
  isProvisionalPayrollRunRecord,
  isProvisionalPayslipMetadata,
} from "../../payroll-runs/use-cases/payroll-runs.usecases";

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

    if (existing.status === "paid" || existing.status === "closed") {
      throwBadRequest(
        `Payroll period in '${existing.status}' status is immutable`,
        ERROR_CODES.INVALID_STATUS_TRANSITION,
        { payrollPeriodId: id, status: existing.status },
      );
    }

    if (existing.status === "processing") {
      throwBadRequest(
        "Payroll period in 'processing' status cannot be modified while payroll calculation is in progress",
        ERROR_CODES.INVALID_STATUS_TRANSITION,
        { payrollPeriodId: id, status: existing.status },
      );
    }

    if (dto.status && ["paid", "processing"].includes(dto.status) && dto.status !== existing.status) {
      throwBadRequest(
        `Cannot transition payroll period directly to '${dto.status}' via generic update`,
        ERROR_CODES.INVALID_STATUS_TRANSITION,
        { payrollPeriodId: id, from: existing.status, to: dto.status },
      );
    }

    if (dto.status !== undefined && !["draft", "open", "closed"].includes(dto.status)) {
      throwBadRequest(
        `Invalid payroll period status '${dto.status}'; allowed statuses on update are 'draft', 'open', or 'closed'`,
        ERROR_CODES.INVALID_STATUS_TRANSITION,
        { payrollPeriodId: id, from: existing.status, to: dto.status },
      );
    }

    if (
      dto.status === "closed" &&
      typeof this.payrollPeriodsRepo.findRunsWithPayslipsByPeriodId === "function"
    ) {
      const periodRuns =
        await this.payrollPeriodsRepo.findRunsWithPayslipsByPeriodId(id);
      for (const run of periodRuns) {
        const runCheck = isProvisionalPayrollRunRecord(run);
        const runPayslips = Array.isArray((run as { payslips?: unknown[] }).payslips)
          ? ((run as { payslips: Array<{ id?: string; metadata?: unknown }> }).payslips)
          : [];
        const provisionalPayslip = runPayslips.find(
          (ps) => isProvisionalPayslipMetadata(ps.metadata).isProvisional,
        );
        if (runCheck.isProvisional || provisionalPayslip || runPayslips.length === 0) {
          throwConflict(
            "Cannot close or finalize payroll period while it contains provisional payroll runs or unconfirmed payslips",
            ERROR_CODES.INVALID_STATUS_TRANSITION,
            {
              payrollPeriodId: id,
              payrollRunId: run.id,
              payslipId: provisionalPayslip?.id ?? null,
            },
          );
        }
        if (run.status !== "posted") {
          throwConflict(
            `Cannot close or finalize payroll period while payroll run '${run.id}' is in '${run.status}' status; all runs must be posted`,
            ERROR_CODES.INVALID_STATUS_TRANSITION,
            {
              payrollPeriodId: id,
              payrollRunId: run.id,
              payrollRunStatus: run.status,
            },
          );
        }
      }
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



