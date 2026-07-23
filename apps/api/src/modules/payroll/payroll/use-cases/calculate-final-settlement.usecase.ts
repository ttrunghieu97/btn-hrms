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

export interface FinalSettlementResult {
  status: "settled" | "failed";
  payrollRef?: string;
  proratedSalary?: number;
  daysWorked?: number;
  daysInMonth?: number;
}

/**
 * Computes a departing employee's final settlement when offboarding completes.
 *
 * Scope (per product decision): prorate the base salary for the final partial
 * month up to the employee's end date and persist it as a draft payslip, then
 * report the result back to offboarding's settlement link.
 *
 * Deliberately OUT of scope for now (logged as TODO, not silently dropped):
 *   - unused-leave payout — no leave-balance data source exists yet
 *   - final tax / statutory adjustment on the settlement amount
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
    const { proratedSalary, daysWorked, daysInMonth } = this.prorate(
      baseSalary,
      endDate,
    );

    const monthStart = this.firstOfMonth(endDate);
    const effectiveTo = this.toDateString(endDate);

    const payroll = await this.payrollRepo.upsertByEmployeeId(employeeId, {
      salary: String(proratedSalary),
      netSalary: String(proratedSalary),
      currency: salaryStructure.currency ?? "VND",
      effectiveFrom: monthStart,
      effectiveTo,
    });

    // TODO(final-settlement): add unused-leave payout once a leave-balance
    // reader port exists, and apply final tax / statutory adjustment. Tracked
    // separately — intentionally not part of the salary-prorate seam.
    this.logger.log({
      event: "final_settlement_computed",
      employeeId,
      processId,
      payrollRef: payroll.id,
      proratedSalary,
      daysWorked,
      daysInMonth,
      unusedLeavePayout: "TODO: no leave-balance source",
      taxAdjustment: "TODO: not yet applied",
    });

    await this.settlementWriter.markSettled(processId, payroll.id);

    return {
      status: "settled",
      payrollRef: payroll.id,
      proratedSalary,
      daysWorked,
      daysInMonth,
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
