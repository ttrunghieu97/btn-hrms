import { formatDateISO } from "@/shared/utils/date-format";
import { Inject, Injectable } from "@nestjs/common";
import { PayrollRepository } from "../repositories/payroll.repository";
import {
  EMPLOYEE_READER_PORT,
  IEmployeeReader,
} from "../../../../contracts/ports/employee-reader.port";
import {
  ISettlementStatusWriterPort,
  SETTLEMENT_STATUS_WRITER_PORT,
} from "../../../../contracts/ports/settlement-status-writer.port";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { ContextLogger } from "../../../../shared/logging/context-logger";

export interface CalculateFinalSettlementInput {
  processId: string;
  employeeId: string;
}

export const FINAL_SETTLEMENT_OMITTED_COMPONENTS = [
  "unused_leave_payout",
  "final_tax_adjustment",
  "statutory_insurance_adjustment",
  "working_day_attendance_proration",
] as const;

export const FINAL_SETTLEMENT_POLICY_BLOCKER_CODE =
  "BIZ_005_FINAL_SETTLEMENT_POLICY_UNCONFIRMED";

export interface FinalSettlementResult {
  status: "settled" | "failed";
  payrollRef?: string;
  proratedSalary?: number;
  daysWorked?: number;
  daysInMonth?: number;
  isProvisional?: boolean;
  settlementComplete?: boolean;
  requiresManualReviewBeforePublish?: boolean;
  policyBlockerCode?: string;
  omittedComponents?: readonly string[];
}

/**
 * Computes a departing employee's final settlement draft when offboarding completes.
 *
 * Because HR/Finance policy for unused-leave conversion, final PIT/statutory
 * adjustments, and working-day vs calendar-day proration is not yet confirmed
 * (`NEEDS_BUSINESS_CONFIRMATION`), this use-case persists a PROVISIONAL draft
 * payslip flagged with `settlementComplete: false` and
 * `requiresManualReviewBeforePublish: true` so it cannot be published to the
 * employee as a completed settlement without manual HR/Finance completion.
 */
@Injectable()
export class CalculateFinalSettlementUseCase {
  private readonly logger: ContextLogger;

  constructor(
    private readonly payrollRepo: PayrollRepository,
    @Inject(EMPLOYEE_READER_PORT)
    private readonly employeeReader: IEmployeeReader,
    @Inject(SETTLEMENT_STATUS_WRITER_PORT)
    private readonly settlementWriter: ISettlementStatusWriterPort,
    requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(
      requestContext,
      CalculateFinalSettlementUseCase.name,
    );
  }

  async execute(
    input: CalculateFinalSettlementInput,
  ): Promise<FinalSettlementResult> {
    const { processId, employeeId } = input;

    await this.settlementWriter.markProcessing(processId);

    let payroll: { id: string };
    let proratedSalary = 0;
    let daysWorked = 0;
    let daysInMonth = 0;

    try {
      const salaryStructure =
        await this.payrollRepo.getCurrentSalaryStructureByEmployeeId(employeeId);

      if (!salaryStructure) {
        this.logger.warn({
          event: "final_settlement_no_salary_structure",
          employeeId,
          processId,
        });
        await this.settlementWriter.markFailed(processId);
        return { status: "failed" };
      }

      const employee = await this.employeeReader.findEmployeeById(employeeId);
      const endDate = this.resolveEndDate(employee?.endDate ?? null);

      const baseSalary = Number(salaryStructure.baseSalary ?? 0);
      const proration = this.prorate(baseSalary, endDate);
      proratedSalary = proration.proratedSalary;
      daysWorked = proration.daysWorked;
      daysInMonth = proration.daysInMonth;

      const monthStart = this.firstOfMonth(endDate);
      const effectiveTo = this.toDateString(endDate);

      const upsertPayload = {
        salary: String(proratedSalary),
        netSalary: String(proratedSalary),
        currency: salaryStructure.currency ?? "VND",
        effectiveFrom: monthStart,
        effectiveTo,
        metadata: {
          source: "offboarding-final-settlement",
          isProvisional: true,
          settlementComplete: false,
          requiresManualReviewBeforePublish: true,
          policyBlockerCode: FINAL_SETTLEMENT_POLICY_BLOCKER_CODE,
          omittedComponents: [...FINAL_SETTLEMENT_OMITTED_COMPONENTS],
          prorationBasis: "calendar_days_provisional",
        },
      };

      const committedPayroll =
        typeof this.payrollRepo.transaction === "function"
          ? await this.payrollRepo.transaction((tx) =>
              this.payrollRepo.upsertByEmployeeId(employeeId, upsertPayload, tx),
            )
          : await this.payrollRepo.upsertByEmployeeId(employeeId, upsertPayload);

      if (!committedPayroll || !committedPayroll.id) {
        throw new Error(
          `Final settlement transaction did not produce a valid payslip reference for process ${processId}`,
        );
      }

      payroll = committedPayroll;
    } catch (txError) {
      this.logger.error({
        event: "final_settlement_transaction_failed",
        employeeId,
        processId,
        error: txError instanceof Error ? txError.message : String(txError),
      });

      try {
        await this.settlementWriter.markFailed(processId);
      } catch (markFailedError) {
        this.logger.error({
          event: "final_settlement_mark_failed_persistence_error",
          employeeId,
          processId,
          originalError:
            txError instanceof Error ? txError.message : String(txError),
          markFailedError:
            markFailedError instanceof Error
              ? markFailedError.message
              : String(markFailedError),
          recoveryHint:
            "Settlement link remained in processing; eligible for stale-processing timeout recovery or retry",
        });
      }

      throw txError;
    }

    this.logger.warn({
      event: "final_settlement_provisional_draft_created",
      employeeId,
      processId,
      payrollRef: payroll.id,
      proratedSalary,
      daysWorked,
      daysInMonth,
      isProvisional: true,
      settlementComplete: false,
      requiresManualReviewBeforePublish: true,
      policyBlockerCode: FINAL_SETTLEMENT_POLICY_BLOCKER_CODE,
      omittedComponents: [...FINAL_SETTLEMENT_OMITTED_COMPONENTS],
    });

    await this.settlementWriter.markSettled(processId, payroll.id);

    return {
      status: "settled",
      payrollRef: payroll.id,
      proratedSalary,
      daysWorked,
      daysInMonth,
      isProvisional: true,
      settlementComplete: false,
      requiresManualReviewBeforePublish: true,
      policyBlockerCode: FINAL_SETTLEMENT_POLICY_BLOCKER_CODE,
      omittedComponents: FINAL_SETTLEMENT_OMITTED_COMPONENTS,
    };
  }

  /** End date = employee end date if set, otherwise the completion date (today). */
  private resolveEndDate(endDate: string | null): Date {
    if (endDate) {
      const parsed = new Date(endDate);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  }

  /**
   * Calendar-day proration of the final partial month: pay for days worked
   * (month start through end date, inclusive) as a fraction of the month.
   * Calendar days chosen over a 22-working-day divisor because the settlement
   * seam has no attendance calendar; documented so it can be revisited.
   */
  private prorate(
    baseSalary: number,
    endDate: Date,
  ): { proratedSalary: number; daysWorked: number; daysInMonth: number } {
    const year = endDate.getUTCFullYear();
    const month = endDate.getUTCMonth();
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const daysWorked = endDate.getUTCDate();
    const proratedSalary = Math.round((baseSalary * daysWorked) / daysInMonth);
    return { proratedSalary, daysWorked, daysInMonth };
  }

  private firstOfMonth(date: Date): string {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    return this.toDateString(new Date(Date.UTC(year, month, 1)));
  }

  private toDateString(date: Date): string {
    return formatDateISO(date);
  }
}
