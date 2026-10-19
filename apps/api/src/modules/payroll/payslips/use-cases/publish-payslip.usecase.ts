import { Injectable } from "@nestjs/common";
import { PayslipsRepository } from "../repositories/payslips.repository";
import { PublishPayslipDto } from "../dto/publish-payslip.dto";
import {
  throwBadRequest,
  throwConflict,
  throwNotFound,
} from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { PayslipMapper } from "../mappers/payslip.mapper";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { PayslipPublishedEvent } from "../../../../core/events/events/payslip-published.event";
import { isProvisionalPayslipMetadata } from "../../payroll-runs/use-cases/payroll-runs.usecases";

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

  private assertPublishable(id: string, record: {
    status?: string | null;
    payrollRunId?: string | null;
    payrollRun?: { status?: string | null } | null;
    metadata?: unknown;
  }, targetStatus: string) {
    if (targetStatus !== "published") {
      throwBadRequest(
        `Invalid target payslip status '${targetStatus}'; publish endpoint only transitions payslips to 'published'`,
        ERROR_CODES.INVALID_STATUS_TRANSITION,
        { payslipId: id, targetStatus },
      );
    }

    if (record.status === "voided") {
      throwConflict(
        "Voided payslip cannot be published",
        ERROR_CODES.INVALID_STATUS_TRANSITION,
        { payslipId: id },
      );
    }

    if (record.status && record.status !== "draft") {
      throwConflict(
        `Payslip in '${record.status}' status cannot be published; only 'draft' payslips can transition to 'published'`,
        ERROR_CODES.INVALID_STATUS_TRANSITION,
        { payslipId: id, status: record.status },
      );
    }

    const existingMeta =
      record.metadata && typeof record.metadata === "object"
        ? (record.metadata as Record<string, unknown>)
        : {};
    if (
      existingMeta.settlementComplete === false ||
      existingMeta.requiresManualReviewBeforePublish === true
    ) {
      throwConflict(
        "Provisional final-settlement payslip cannot be published before manual HR/Finance completion of omitted settlement components",
        ERROR_CODES.INVALID_STATUS_TRANSITION,
        {
          payslipId: id,
          policyBlockerCode: existingMeta.policyBlockerCode ?? "BIZ_005_FINAL_SETTLEMENT_POLICY_UNCONFIRMED",
          omittedComponents: existingMeta.omittedComponents ?? [],
        },
      );
    }

    const provisionalCheck = isProvisionalPayslipMetadata(record.metadata);
    if (provisionalCheck.isProvisional) {
      throwConflict(
        "Provisional payroll payslip cannot be published while HR/Finance payroll policies remain unconfirmed",
        ERROR_CODES.INVALID_STATUS_TRANSITION,
        {
          payslipId: id,
          calculationStatus:
            provisionalCheck.calculationStatus ?? "PROVISIONAL_POLICY_UNCONFIRMED",
          policyBlockerCode:
            provisionalCheck.policyBlockerCode ??
            "BIZ_004_PAYROLL_POLICY_UNCONFIRMED",
          unconfirmedPolicyComponents:
            provisionalCheck.unconfirmedComponents ??
            existingMeta.unconfirmedPolicyComponents ??
            existingMeta.omittedComponents ??
            [],
        },
      );
    }

    if (!record.payrollRunId || record.payrollRun === null) {
      throwConflict(
        "Cannot publish payslip without an approved or posted parent payroll run",
        ERROR_CODES.INVALID_STATUS_TRANSITION,
        {
          payslipId: id,
          payrollRunId: record.payrollRunId ?? null,
        },
      );
    }

    if (
      record.payrollRun !== undefined &&
      (!record.payrollRun?.status || !["approved", "posted"].includes(record.payrollRun.status))
    ) {
      throwConflict(
        `Cannot publish payslip while parent payroll run is in '${record.payrollRun?.status ?? "unapproved"}' status`,
        ERROR_CODES.INVALID_STATUS_TRANSITION,
        {
          payslipId: id,
          payrollRunId: record.payrollRunId ?? null,
          payrollRunStatus: record.payrollRun?.status ?? null,
        },
      );
    }
  }

  async execute(id: string, dto: PublishPayslipDto) {
    const existing = await this.payslipsRepo.findById(id);
    if (!existing) {
      throwNotFound("Payslip not found", ERROR_CODES.PAYROLL_NOT_FOUND, {
        payslipId: id,
      });
    }
    const targetStatus = dto.status ?? "published";
    this.assertPublishable(id, existing as any, targetStatus);

    await this.payslipsRepo.transaction(async (tx) => {
      const current = (await this.payslipsRepo.findById(id, tx as any)) ?? existing;
      this.assertPublishable(id, current as any, targetStatus);

      const updated = await this.payslipsRepo.update(id, {
        status: "published",
        publishedAt: new Date(),
        metadata: dto.note
          ? {
              ...(current.metadata ?? {}),
              note: dto.note,
            }
          : current.metadata,
      }, tx);

      if (!updated) {
        throwConflict(
          "Payslip status changed concurrently and could not be published",
          ERROR_CODES.CONFLICT,
          { payslipId: id },
        );
      }

      await this.eventOutbox.stage(
        new PayslipPublishedEvent({
          payslipId: id,
          employeeId: current.employeeId,
          payrollRunId: current.payrollRunId ?? null,
        }),
        tx,
      );
    });

    return PayslipMapper.toResponseDto((await this.payslipsRepo.findById(id))! as Parameters<typeof PayslipMapper.toResponseDto>[0]);
  }
}







