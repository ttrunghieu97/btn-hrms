import { Inject, Injectable } from "@nestjs/common";
import {
  throwBadRequest,
  throwNotFound,
} from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import {
  PayrollItemCreateInput,
  PayrollRunCreateInput,
  PayrollRunsRepository,
  PayrollRunTransaction,
  PayrollRunUpdateInput,
} from "../repositories/payroll-runs.repository";
import { PayrollRunMapper } from "../mappers/payroll-run.mapper";
import {
  CONTRACTS_TOKENS,
  AttendanceReadPort,
  ATTENDANCE_PAY_POLICY,
  AttendancePayPolicy,
  IAttendanceAdjustmentReader,
} from "../../../../contracts";
import { ATTENDANCE_ADJUSTMENT_READER } from "../../../../contracts/ports/attendance-adjustment-reader.port";
import { PayrollGeneratedEvent } from "../../../../core/events/events/payroll-generated.event";
import { PayrollProcessedEvent } from "../../../../core/events/events/payroll-processed.event";
import { PayrollApprovedEvent } from "../../../../core/events/events/payroll-approved.event";
import { PayrollRejectedEvent } from "../../../../core/events/events/payroll-rejected.event";
import { PayrollPostedEvent } from "../../../../core/events/events/payroll-posted.event";
import { getScopeId } from "../../../../shared/constants/system";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { PayrollRunQueryDto } from "../dto/payroll-run-query.dto";
import { CreatePayrollRunDto } from "../dto/create-payroll-run.dto";
import { UpdatePayrollRunDto } from "../dto/update-payroll-run.dto";
import { PayrollRunStateMachine } from "../services/payroll-run-state-machine";

type PayslipInput = {
  payrollRunId: string;
  employeeId: string;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  currency: string;
  status: string;
  metadata: Record<string, unknown>  ;
};

type EmployeeCalculation = {
  employeeId: string;
  baseSalary: number;
  hourlyRate: number;
  overtimeAmount: number;
  overtimeMinutes: number;
  deduction: number;
  absentDays: number;
};

@Injectable()
export class ListPayrollRunsUseCase {
  constructor(private readonly repo: PayrollRunsRepository) {}
  async execute(query: PayrollRunQueryDto) {
    const result = await this.repo.list(query);
    return { ...result, rows: result.rows.map(PayrollRunMapper.toDto) };
  }
}

@Injectable()
export class GetPayrollRunUseCase {
  constructor(private readonly repo: PayrollRunsRepository) {}
  async execute(id: string) {
    const row = await this.repo.findById(id);
    if (!row)
      throwNotFound("Payroll run not found", ERROR_CODES.PAYROLL_NOT_FOUND, {
        payrollRunId: id,
      });
    return PayrollRunMapper.toDto(row);
  }
}

@Injectable()
export class CreatePayrollRunUseCase {
  constructor(private readonly repo: PayrollRunsRepository) {}
  async execute(dto: CreatePayrollRunDto) {
    const row = await this.repo.create(
      PayrollRunMapper.toEntity({
        ...dto,
        status: dto.status ?? "draft",
      }) as PayrollRunCreateInput,
    );
    const created = await this.repo.findById(row!.id);
    return PayrollRunMapper.toDto(created!);
  }
}

@Injectable()
export class UpdatePayrollRunUseCase {
  constructor(private readonly repo: PayrollRunsRepository) {}
  async execute(id: string, dto: UpdatePayrollRunDto) {
    const existing = await this.repo.findById(id);
    if (!existing)
      throwNotFound("Payroll run not found", ERROR_CODES.PAYROLL_NOT_FOUND, {
        payrollRunId: id,
      });
    await this.repo.update(
      id,
      PayrollRunMapper.toEntity(dto),
    );
    const updated = await this.repo.findById(id);
    return PayrollRunMapper.toDto(updated!);
  }
}

@Injectable()
export class GeneratePayrollRunUseCase {
  constructor(
    private readonly repo: PayrollRunsRepository,
    @Inject(CONTRACTS_TOKENS.ATTENDANCE_READ_PORT)
    private readonly attendanceReadPort: AttendanceReadPort,
    @Inject(ATTENDANCE_PAY_POLICY)
    private readonly payPolicy: AttendancePayPolicy,
    @Inject(ATTENDANCE_ADJUSTMENT_READER)
    private readonly adjustmentReader: IAttendanceAdjustmentReader,
    private readonly eventOutbox: EventOutboxService,
    private readonly stateMachine: PayrollRunStateMachine,
  ) {}

  async execute(id: string) {
    const payrollRun = await this.repo.findById(id);
    if (!payrollRun) {
      throwNotFound("Payroll run not found", ERROR_CODES.PAYROLL_NOT_FOUND, {
        payrollRunId: id,
      });
    }

    if (["approved", "paid", "closed", "pending_approval"].includes(payrollRun.status)) {
      throwBadRequest(
        "Payroll run cannot be regenerated after approval",
        ERROR_CODES.INVALID_REQUEST,
        { payrollRunId: id, status: payrollRun.status },
      );
    }

    const payrollPeriod = await this.repo.getPayrollPeriodById(
      payrollRun.payrollPeriodId,
    );
    if (!payrollPeriod) {
      throwNotFound("Payroll period not found", ERROR_CODES.PAYROLL_NOT_FOUND, {
        payrollPeriodId: payrollRun.payrollPeriodId,
      });
    }

    const employees = await this.repo.getEmployeesForPayrollRun({
      branchId: payrollRun.branchId,
    });

    const employeeIds = employees.map((employee) => employee.id);

    const periodKey = `${payrollPeriod.startsOn.slice(0, 7)}`;

    const salaryByEmployee = await this.repo.getCurrentSalaryByEmployee(
      employeeIds,
    );

    const rawSummaries = await this.attendanceReadPort.getEffectiveDailySummaries(
      employeeIds,
      payrollPeriod.startsOn,
      payrollPeriod.endsOn,
    );

    const attendanceByEmployee = new Map<string, typeof rawSummaries>();
    for (const row of rawSummaries) {
      const current = attendanceByEmployee.get(row.employeeId) ?? [];
      current.push(row);
      attendanceByEmployee.set(row.employeeId, current);
    }

    // Path A: resolved truth via AttendanceReadPort + payPolicy
    // Path B (TimeManagementPayrollAdapter) removed — it derived truth from raw
    // clock events, producing inconsistent results (S1-4 / PR-2).

    // Load post-closure adjustment deltas (if any)
    const adjustmentDeltas = await this.adjustmentReader.getAdjustmentDeltas(
      periodKey,
      employeeIds,
    );
    const deltaByEmployee = new Map(adjustmentDeltas.map((d) => [d.employeeId, d]));

    // Resolve active calculation version for provenance
    const calcVersion = await this.repo.findActiveCalculationVersion();
    const calcVersionId = calcVersion?.id ?? null;
    const calcVersionCode = calcVersion?.code ?? "unknown";

    await this.repo.transaction(async (tx: PayrollRunTransaction) => {
      await this.repo.markRunProcessing(payrollRun.id, tx);
      await this.repo.deleteRunItems(payrollRun.id, tx);
      await this.repo.deleteRunPayslips(payrollRun.id, tx);

      // Capture input snapshots before calculation — freezes what goes into
      // the payroll engine. Ensures reproducibility: a payroll result can
      // always be traced to the exact input snapshot that produced it.
      const inputSnapshotItems: Array<{
        employeeId: string;
        workedMinutes: number;
        overtimeMinutes: number;
        adjustmentRegular: number;
        adjustmentOvertime: number;
        baseSalary: number;
      }> = [];

      const payslipInputs: PayslipInput[] = [];
      const employeeCalculations: EmployeeCalculation[] = [];

      for (const employee of employees) {
        const salary = salaryByEmployee.get(employee.id);
        if (!salary) continue;

        const summaries = attendanceByEmployee.get(employee.id) ?? [];
        
        let totalWorkedMinutes = 0;
        let totalOvertimeMinutes = 0;
        let absentDays = 0;

        for (const summary of summaries) {
          const payResult = this.payPolicy.evaluate(summary);
          totalWorkedMinutes += payResult.payableMinutes;
          totalOvertimeMinutes += payResult.payableOvertimeMinutes;

          if (payResult.attendanceOutcome === "absent") {
            absentDays++;
          }
        }

        // Apply post-closure adjustment delta (if any)
        // Adjustments are approved post-closure corrections — they layer on
        // top of the immutable snapshot without rewriting it.
        let adjustmentRegularDelta = 0;
        let adjustmentOvertimeDelta = 0;
        const delta = deltaByEmployee.get(employee.id);
        if (delta) {
          adjustmentRegularDelta = delta.regularHoursDelta * 60;
          adjustmentOvertimeDelta = delta.overtimeHoursDelta * 60;
          totalWorkedMinutes += adjustmentRegularDelta;
          totalOvertimeMinutes += adjustmentOvertimeDelta;
        }

        // Capture input snapshot for this employee
        const baseSalary = Number(salary.baseSalary ?? 0);
        const snapshotRegular = totalWorkedMinutes - adjustmentRegularDelta;
        const snapshotOvertime = totalOvertimeMinutes - adjustmentOvertimeDelta;
        inputSnapshotItems.push({
          employeeId: employee.id,
          workedMinutes: snapshotRegular,
          overtimeMinutes: snapshotOvertime,
          adjustmentRegular: adjustmentRegularDelta,
          adjustmentOvertime: adjustmentOvertimeDelta,
          baseSalary,
        });

        const hourlyRate = baseSalary / 160;
        const overtimeAmount = Math.round(
          (totalOvertimeMinutes / 60) * hourlyRate * 1.5,
        );
        const deduction = Math.round((baseSalary / 22) * absentDays);
        const allowance = 0;
        const taxAmount = 0;
        const insuranceAmount = 0;
        const grossPay = baseSalary + allowance + overtimeAmount;
        const totalDeductions = deduction + taxAmount + insuranceAmount;
        const netPay = grossPay - totalDeductions;

        payslipInputs.push({
          payrollRunId: payrollRun.id,
          employeeId: employee.id,
          grossPay,
          totalDeductions,
          netPay,
          currency: salary.currency ?? "VND",
          status: "draft",
          metadata: {
            workedMinutes: totalWorkedMinutes,
            overtimeMinutes: totalOvertimeMinutes,
            absentDays,
            snapshotWorkedMinutes: totalWorkedMinutes - adjustmentRegularDelta,
            snapshotOvertimeMinutes: totalOvertimeMinutes - adjustmentOvertimeDelta,
            adjustmentRegularDelta,
            adjustmentOvertimeDelta,
          },
        });

        employeeCalculations.push({
          employeeId: employee.id,
          baseSalary,
          hourlyRate,
          overtimeAmount,
          overtimeMinutes: totalOvertimeMinutes,
          deduction,
          absentDays,
        });
      }

      const createdPayslips = await this.repo.createPayslips(payslipInputs, tx);
      const payslipMap = new Map(createdPayslips.map((p) => [p.employeeId, p.id]));

      const allItemValues: PayrollItemCreateInput[] = [];
      const events: PayrollGeneratedEvent[] = [];

      for (const calc of employeeCalculations) {
        const payslipId = payslipMap.get(calc.employeeId);
        if (!payslipId) continue;

        allItemValues.push(
          {
            payrollRunId: payrollRun.id,
            employeeId: calc.employeeId,
            payslipId,
            type: "earning",
            code: "base_salary",
            name: "Base Salary",
            amount: String(calc.baseSalary),
            quantity: "1",
            rate: String(calc.baseSalary),
            metadata: { source: "salary_structure" },
          },
          {
            payrollRunId: payrollRun.id,
            employeeId: calc.employeeId,
            payslipId,
            type: "overtime",
            code: "overtime",
            name: "Overtime",
            amount: String(calc.overtimeAmount),
            quantity: String(calc.overtimeMinutes / 60),
            rate: String(calc.hourlyRate * 1.5),
            metadata: { source: "attendance_summary" },
          },
          {
            payrollRunId: payrollRun.id,
            employeeId: calc.employeeId,
            payslipId,
            type: "deduction",
            code: "absence_deduction",
            name: "Absence Deduction",
            amount: String(calc.deduction),
            quantity: String(calc.absentDays),
            rate: String(calc.baseSalary / 22),
            metadata: { source: "attendance_summary" },
          },
        );

        events.push(new PayrollGeneratedEvent(calc.employeeId, String(payslipId)));
      }

      // Persist input snapshots (freeze what entered calculation)
      for (const item of inputSnapshotItems) {
        const delta = deltaByEmployee.get(item.employeeId);
        await this.repo.insertInputSnapshot(
          {
            payrollRunId: payrollRun.id,
            employeeId: item.employeeId,
            status: "ready",
            sourceVersions: {
              attendanceSnapshot: periodKey,
              adjustmentVersion: delta ? 1 : 0,
              generatedAt: new Date().toISOString(),
            },
            generatedByUserId: null,
            generatedAt: new Date(),
          },
          [
            { inputType: "ATTENDANCE_REGULAR_MINUTES", value: item.workedMinutes, sourceReference: "attendance_policy" },
            { inputType: "ATTENDANCE_OVERTIME_MINUTES", value: item.overtimeMinutes, sourceReference: "attendance_policy" },
            ...(item.adjustmentRegular !== 0 ? [{ inputType: "ATTENDANCE_ADJUSTMENT_REGULAR" as const, value: item.adjustmentRegular, sourceReference: "adjustment" }] : []),
            ...(item.adjustmentOvertime !== 0 ? [{ inputType: "ATTENDANCE_ADJUSTMENT_OVERTIME" as const, value: item.adjustmentOvertime, sourceReference: "adjustment" }] : []),
            { inputType: "BASE_SALARY" as const, value: item.baseSalary, sourceReference: "salary_structure" },
          ],
          tx,
        );
      }

      if (allItemValues.length > 0) {
        await this.repo.createPayrollItems(allItemValues, tx);
      }

      for (const event of events) {
        await this.eventOutbox.stage(event, tx);
      }

      // Update payroll run with calculation provenance
      if (calcVersionId) {
        await this.repo.update(payrollRun.id, {
          calculationVersionId: calcVersionId,
          calculationHash: simpleHash(JSON.stringify({
            employeeCount: inputSnapshotItems.length,
            totalWorkedMinutes: inputSnapshotItems.reduce((s, i) => s + i.workedMinutes, 0),
            totalOvertimeMinutes: inputSnapshotItems.reduce((s, i) => s + i.overtimeMinutes, 0),
            adjustmentCount: inputSnapshotItems.filter((i) => i.adjustmentRegular !== 0 || i.adjustmentOvertime !== 0).length,
            calcVersion: calcVersionCode,
            calcTimestamp: new Date().toISOString().slice(0, 16),
          })),
        } as any);
      }

      await this.repo.markRunPendingApproval(payrollRun.id, tx);

      await this.eventOutbox.stage(
        new PayrollProcessedEvent({
          scopeId: getScopeId(),
          payrollRunId: payrollRun.id,
          processedByUserId: null,
        }),
        tx,
      );
    });

    const generated = await this.repo.findById(id);
    return PayrollRunMapper.toDto(generated!);
  }
}

@Injectable()
export class ApprovePayrollRunUseCase {
  constructor(
    private readonly repo: PayrollRunsRepository,
    private readonly stateMachine: PayrollRunStateMachine,
    private readonly eventOutbox: EventOutboxService,
  ) {}

  async execute(id: string, approvedByUserId: string, comment?: string) {
    const run = await this.repo.findById(id);
    if (!run) throwNotFound("Payroll run not found", ERROR_CODES.PAYROLL_NOT_FOUND, { payrollRunId: id });

    const currentStatus = run.status as "draft" | "processing" | "pending_approval" | "approved" | "posted";
    this.stateMachine.assertTransition(currentStatus, "approved");

    await this.repo.transaction(async (tx) => {
      await this.repo.update(id, { status: "approved" } as any);
      await this.repo.recordApprovalAction(id, "APPROVED", approvedByUserId, comment ?? null, tx);

      await this.eventOutbox.stage(
        new PayrollApprovedEvent({
          payrollRunId: id,
          approvedByUserId,
          scopeId: getScopeId(),
        }),
        tx,
      );
    });

    const updated = await this.repo.findById(id);
    return PayrollRunMapper.toDto(updated!);
  }
}

@Injectable()
export class RejectPayrollRunUseCase {
  constructor(
    private readonly repo: PayrollRunsRepository,
    private readonly stateMachine: PayrollRunStateMachine,
    private readonly eventOutbox: EventOutboxService,
  ) {}

  async execute(id: string, rejectedByUserId: string, reason: string) {
    const run = await this.repo.findById(id);
    if (!run) throwNotFound("Payroll run not found", ERROR_CODES.PAYROLL_NOT_FOUND, { payrollRunId: id });

    const currentStatus = run.status as "draft" | "processing" | "pending_approval" | "approved" | "posted";
    // rejection transitions to draft (editable state for resubmission)
    this.stateMachine.assertTransition(currentStatus, "draft");

    await this.repo.transaction(async (tx) => {
      await this.repo.update(id, { status: "draft" } as any);
      await this.repo.recordApprovalAction(id, "REJECTED", rejectedByUserId, reason, tx);

      await this.eventOutbox.stage(
        new PayrollRejectedEvent({
          payrollRunId: id,
          rejectedByUserId,
          reason,
          scopeId: getScopeId(),
        }),
        tx,
      );
    });

    const updated = await this.repo.findById(id);
    return PayrollRunMapper.toDto(updated!);
  }
}

@Injectable()
export class RequestPayrollApprovalUseCase {
  constructor(
    private readonly repo: PayrollRunsRepository,
    private readonly stateMachine: PayrollRunStateMachine,
  ) {}

  async execute(id: string, requestedByUserId: string) {
    const run = await this.repo.findById(id);
    if (!run) throwNotFound("Payroll run not found", ERROR_CODES.PAYROLL_NOT_FOUND, { payrollRunId: id });

    const currentStatus = run.status as "draft" | "processing" | "pending_approval" | "approved" | "posted";
    this.stateMachine.assertTransition(currentStatus, "pending_approval");

    await this.repo.transaction(async (tx) => {
      await this.repo.update(id, { status: "pending_approval" } as any);
      await this.repo.recordApprovalAction(id, "REQUESTED", requestedByUserId, null, tx);
    });

    const updated = await this.repo.findById(id);
    return PayrollRunMapper.toDto(updated!);
  }
}

@Injectable()
export class PostPayrollRunUseCase {
  constructor(
    private readonly repo: PayrollRunsRepository,
    private readonly stateMachine: PayrollRunStateMachine,
    private readonly eventOutbox: EventOutboxService,
  ) {}

  async execute(id: string, postedByUserId: string) {
    const run = await this.repo.findById(id);
    if (!run) throwNotFound("Payroll run not found", ERROR_CODES.PAYROLL_NOT_FOUND, { payrollRunId: id });

    const currentStatus = run.status as "draft" | "processing" | "pending_approval" | "approved" | "posted";
    this.stateMachine.assertTransition(currentStatus, "posted");

    // Posting guards — validate preconditions for financial publication
    if (!run.calculationVersionId) {
      throwBadRequest(
        "Payroll run has no calculation version. Generate payroll before posting.",
        ERROR_CODES.INVALID_REQUEST,
      );
    }
    if (!run.calculationHash) {
      throwBadRequest(
        "Payroll run has no calculation hash. Generate payroll before posting.",
        ERROR_CODES.INVALID_REQUEST,
      );
    }

    await this.repo.transaction(async (tx) => {
      await this.repo.update(id, {
        status: "posted",
        postedByUserId,
        postedAt: new Date(),
        publicationStatus: "pending",
      } as any);

      await this.repo.recordApprovalAction(id, "APPROVED", postedByUserId, "Payroll posted", tx);

      await this.eventOutbox.stage(
        new PayrollPostedEvent({
          payrollRunId: id,
          postedByUserId,
          scopeId: getScopeId(),
        }),
        tx,
      );
    });

    const updated = await this.repo.findById(id);
    return PayrollRunMapper.toDto(updated!);
  }
}

/** Deterministic simple hash for calculation provenance. */
function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}
