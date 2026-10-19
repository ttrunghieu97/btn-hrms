import { Inject, Injectable } from "@nestjs/common";
import {
  throwBadRequest,
  throwConflict,
  throwNotFound,
  throwForbidden,
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
import { PayrollRunStateMachine, type PayrollRunStatus } from "../services/payroll-run-state-machine";

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
    const requestedStatus = (dto as { status?: string }).status;
    if (requestedStatus !== undefined && requestedStatus !== "draft") {
      throwBadRequest(
        `Cannot create payroll run in '${requestedStatus}' status; new payroll runs must start in 'draft'`,
        ERROR_CODES.INVALID_STATUS_TRANSITION,
        { status: requestedStatus },
      );
    }

    const existing = await this.repo.findByPeriodAndBranch(
      dto.payrollPeriodId,
      dto.branchId ?? null,
    );
    if (existing) {
      throwConflict(
        "A payroll run already exists for this period and branch scope",
        ERROR_CODES.CONFLICT,
        { payrollPeriodId: dto.payrollPeriodId, branchId: dto.branchId ?? null },
      );
    }

    const row = await this.repo.create(
      PayrollRunMapper.toEntity({
        ...dto,
        status: "draft",
      }) as PayrollRunCreateInput,
    );
    const created = await this.repo.findById(row!.id);
    return PayrollRunMapper.toDto(created!);
  }
}

@Injectable()
export class UpdatePayrollRunUseCase {
  constructor(
    private readonly repo: PayrollRunsRepository,
    private readonly stateMachine: PayrollRunStateMachine,
  ) {}
  async execute(id: string, dto: UpdatePayrollRunDto) {
    const existing = await this.repo.findById(id);
    if (!existing)
      throwNotFound("Payroll run not found", ERROR_CODES.PAYROLL_NOT_FOUND, {
        payrollRunId: id,
      });

    if (this.stateMachine.isTerminal(existing.status as PayrollRunStatus)) {
      throwBadRequest("Posted payroll run is immutable", ERROR_CODES.INVALID_STATUS_TRANSITION, {
        status: existing.status,
      });
    }

    const requestedStatus = (dto as { status?: string }).status;
    if (requestedStatus !== undefined && requestedStatus !== existing.status) {
      this.stateMachine.assertTransition(
        existing.status as PayrollRunStatus,
        requestedStatus as PayrollRunStatus,
      );
      throwBadRequest(
        `Lifecycle status transition (${existing.status} → ${requestedStatus}) is not permitted via generic update; use the dedicated payroll run lifecycle endpoints`,
        ERROR_CODES.INVALID_STATUS_TRANSITION,
        { from: existing.status, to: requestedStatus },
      );
    }

    if (!this.stateMachine.isEditable(existing.status as PayrollRunStatus)) {
      throwBadRequest(
        `Payroll run in '${existing.status}' status cannot be modified directly`,
        ERROR_CODES.INVALID_STATUS_TRANSITION,
        { status: existing.status },
      );
    }

    const { status: _ignoredStatus, ...safeDto } = dto as Record<string, unknown>;
    await this.repo.update(
      id,
      PayrollRunMapper.toEntity(safeDto),
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

  async execute(id: string, requestedByUserId?: string | null) {
    const payrollRun = await this.repo.findById(id);
    if (!payrollRun) {
      throwNotFound("Payroll run not found", ERROR_CODES.PAYROLL_NOT_FOUND, {
        payrollRunId: id,
      });
    }

    const currentStatus = (payrollRun.status ?? "draft") as string;
    if (["approved", "posted", "paid", "closed", "pending_approval"].includes(currentStatus)) {
      throwBadRequest(
        "Payroll run cannot be regenerated after approval",
        ERROR_CODES.INVALID_REQUEST,
        { payrollRunId: id, status: currentStatus },
      );
    }

    if (typeof this.stateMachine.assertTransition === "function") {
      this.stateMachine.assertTransition(currentStatus as any, "processing");
    } else if (
      currentStatus !== "draft" ||
      (typeof this.stateMachine.canTransition === "function" &&
        !this.stateMachine.canTransition(currentStatus as any, "processing"))
    ) {
      throwBadRequest(
        `Invalid payroll run transition: ${currentStatus} → processing`,
        ERROR_CODES.INVALID_STATUS_TRANSITION,
        { from: currentStatus, to: "processing", payrollRunId: id },
      );
    }

    const normalizedRequesterId =
      typeof requestedByUserId === "string" ? requestedByUserId.trim() : "";
    if (!normalizedRequesterId || normalizedRequesterId === "system") {
      throwForbidden(
        "Approval requester identity is required to enforce Segregation of Duties",
        ERROR_CODES.FORBIDDEN,
        { payrollRunId: id },
      );
    }
    if (typeof this.repo.recordApprovalAction !== "function") {
      throwForbidden(
        "Approval history persistence is required to enforce Segregation of Duties",
        ERROR_CODES.FORBIDDEN,
        { payrollRunId: id },
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

    const salaryByEmployee = await this.repo.getSalaryByEmployeeForPeriod(
      employeeIds,
      payrollPeriod.startsOn,
      payrollPeriod.endsOn,
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
      const processing = await this.repo.markRunProcessing(payrollRun.id, tx, "draft");
      if (!processing || processing.length === 0) {
        throwConflict(
          "Payroll run is currently being processed or its status was changed concurrently",
          ERROR_CODES.CONFLICT,
          { payrollRunId: payrollRun.id },
        );
      }

      const existingSnapshots =
        typeof this.repo.getRunInputSnapshotsWithItems === "function"
          ? await this.repo.getRunInputSnapshotsWithItems(payrollRun.id, tx)
          : [];
      for (const existing of existingSnapshots) {
        if (
          existing.snapshot.status === "locked" ||
          existing.snapshot.lockedAt !== null
        ) {
          throwConflict(
            "Cannot regenerate payroll run: input snapshots are locked",
            ERROR_CODES.CONFLICT,
            { payrollRunId: payrollRun.id, snapshotId: existing.snapshot.id },
          );
        }
      }
      const existingSnapshotByEmployee = new Map(
        existingSnapshots.map((entry) => [entry.snapshot.employeeId, entry]),
      );

      await this.repo.deleteRunItems(payrollRun.id, tx);
      await this.repo.deleteRunPayslips(payrollRun.id, tx);
      if (typeof this.repo.deleteRunInputSnapshots === "function") {
        await this.repo.deleteRunInputSnapshots(payrollRun.id, tx);
      }

      // Capture input snapshots before calculation — freezes what goes into
      // the payroll engine. Ensures reproducibility: a payroll result can
      // always be traced to the exact input snapshot that produced it.
      const inputSnapshotItems: {
        employeeId: string;
        workedMinutes: number;
        overtimeMinutes: number;
        adjustmentRegular: number;
        adjustmentOvertime: number;
        baseSalary: number;
      }[] = [];

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
            calculationStatus: "PROVISIONAL_POLICY_UNCONFIRMED",
            isProvisional: true,
            requiresManualReviewBeforePublish: true,
            policyBlockerCode: "BIZ_004_PAYROLL_POLICY_UNCONFIRMED",
            unconfirmedPolicyComponents: [
              "tax_amount",
              "statutory_insurance_amount",
              "allowance_components",
              "overtime_day_type_multipliers",
              "standard_working_divisor",
              "mid_period_salary_proration",
            ],
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

      // Persist input snapshots (freeze what entered calculation in atomic batch,
      // preserving full historical attempt lineage in sourceVersions.attemptHistory)
      const generatedAtNow = new Date();
      const generatedAtIso = generatedAtNow.toISOString();
      const snapshotEntries = inputSnapshotItems.map((item) => {
        const delta = deltaByEmployee.get(item.employeeId);
        const priorEntry = existingSnapshotByEmployee.get(item.employeeId);
        let attemptNumber = 1;
        let attemptHistory: unknown[] = [];

        if (priorEntry) {
          const priorSourceVersions = (priorEntry.snapshot.sourceVersions ??
            {}) as Record<string, unknown>;
          const priorHistory = Array.isArray(priorSourceVersions.attemptHistory)
            ? priorSourceVersions.attemptHistory
            : [];
          const {
            attemptHistory: _omittedHistory,
            ...priorMetaWithoutHistory
          } = priorSourceVersions;
          const priorAttemptNumber =
            typeof priorSourceVersions.attemptNumber === "number"
              ? priorSourceVersions.attemptNumber
              : priorHistory.length + 1;
          const priorAttemptRecord = {
            attemptNumber: priorAttemptNumber,
            snapshotId: priorEntry.snapshot.id,
            generatedByUserId: priorEntry.snapshot.generatedByUserId ?? null,
            generatedAt:
              priorEntry.snapshot.generatedAt instanceof Date
                ? priorEntry.snapshot.generatedAt.toISOString()
                : String(priorEntry.snapshot.generatedAt),
            sourceVersions: priorMetaWithoutHistory,
            items: priorEntry.items.map((it) => ({
              inputType: it.inputType,
              value: it.value,
              sourceReference: it.sourceReference ?? null,
            })),
          };
          attemptHistory = [...priorHistory, priorAttemptRecord];
          attemptNumber = priorAttemptNumber + 1;
        }

        return {
          snapshot: {
            payrollRunId: payrollRun.id,
            employeeId: item.employeeId,
            status: "ready" as const,
            sourceVersions: {
              attemptNumber,
              attendanceSnapshot: periodKey,
              adjustmentVersion: delta ? 1 : 0,
              generatedAt: generatedAtIso,
              ...(attemptHistory.length > 0 ? { attemptHistory } : {}),
            },
            generatedByUserId: normalizedRequesterId,
            generatedAt: generatedAtNow,
          },
          itemInputs: [
            { inputType: "ATTENDANCE_REGULAR_MINUTES" as const, value: item.workedMinutes, sourceReference: "attendance_policy" },
            { inputType: "ATTENDANCE_OVERTIME_MINUTES" as const, value: item.overtimeMinutes, sourceReference: "attendance_policy" },
            ...(item.adjustmentRegular !== 0 ? [{ inputType: "ATTENDANCE_ADJUSTMENT_REGULAR" as const, value: item.adjustmentRegular, sourceReference: "adjustment" }] : []),
            ...(item.adjustmentOvertime !== 0 ? [{ inputType: "ATTENDANCE_ADJUSTMENT_OVERTIME" as const, value: item.adjustmentOvertime, sourceReference: "adjustment" }] : []),
            { inputType: "BASE_SALARY" as const, value: item.baseSalary, sourceReference: "salary_structure" },
          ],
        };
      });

      if (this.repo.insertInputSnapshotsBatch) {
        await this.repo.insertInputSnapshotsBatch(snapshotEntries, tx);
      } else {
        for (const entry of snapshotEntries) {
          await this.repo.insertInputSnapshot(entry.snapshot, entry.itemInputs, tx);
        }
      }

      if (allItemValues.length > 0) {
        await this.repo.createPayrollItems(allItemValues, tx);
      }

      for (const event of events) {
        await this.eventOutbox.stage(event, tx);
      }

      // Update payroll run with calculation provenance
      if (calcVersionId) {
        await this.repo.update(
          payrollRun.id,
          {
            calculationVersionId: calcVersionId,
            calculationHash: simpleHash(JSON.stringify({
              employeeCount: inputSnapshotItems.length,
              totalWorkedMinutes: inputSnapshotItems.reduce((s, i) => s + i.workedMinutes, 0),
              totalOvertimeMinutes: inputSnapshotItems.reduce((s, i) => s + i.overtimeMinutes, 0),
              adjustmentCount: inputSnapshotItems.filter((i) => i.adjustmentRegular !== 0 || i.adjustmentOvertime !== 0).length,
              calcVersion: calcVersionCode,
              calcTimestamp: new Date().toISOString().slice(0, 16),
            })),
          },
          tx,
        );
      }

      const pendingRows = await this.repo.markRunPendingApproval(payrollRun.id, tx);
      if (Array.isArray(pendingRows) && pendingRows.length === 0) {
        throwConflict(
          "Payroll run status changed concurrently before pending_approval transition",
          ERROR_CODES.CONFLICT,
          { payrollRunId: payrollRun.id },
        );
      }

      await this.repo.recordApprovalAction(
        payrollRun.id,
        "REQUESTED",
        normalizedRequesterId,
        null,
        tx,
      );

      await this.eventOutbox.stage(
        new PayrollProcessedEvent({
          scopeId: getScopeId(),
          payrollRunId: payrollRun.id,
          processedByUserId: normalizedRequesterId,
        }),
        tx,
      );
    });

    const generated = await this.repo.findById(id);
    return PayrollRunMapper.toDto(generated!);
  }
}

const VALID_APPROVAL_HISTORY_ACTIONS = new Set([
  "REQUESTED",
  "RESUBMITTED",
  "APPROVED",
  "REJECTED",
  "POSTED",
]);

function isValidActorIdentity(userId: unknown): userId is string {
  return (
    typeof userId === "string" &&
    userId.trim().length > 0 &&
    userId.trim() !== "system"
  );
}

export interface CurrentCycleApprovalResolution {
  isMalformed: boolean;
  hasPriorRejectionWithoutNewRequest: boolean;
  currentCycleEntries: Array<{
    action: string;
    performedByUserId: string | null;
    comment?: string | null;
  }>;
  requesterUserId: string | null;
  requesterUserIds: string[];
  approverUserIds: string[];
  latestAction: string | null;
}

/**
 * Resolves the active approval cycle from chronological `payroll_run_approval_history`
 * rows. Any entry at or before the last `REJECTED` row belongs to a prior rejected
 * cycle and is strictly excluded so a new cycle can never inherit a stale requester.
 */
export function resolveCurrentCycleApprovalHistory(
  history:
    | Array<{
        action?: string | null;
        performedByUserId?: string | null;
        comment?: string | null;
      }>
    | null
    | undefined,
): CurrentCycleApprovalResolution {
  if (!Array.isArray(history) || history.length === 0) {
    return {
      isMalformed: false,
      hasPriorRejectionWithoutNewRequest: false,
      currentCycleEntries: [],
      requesterUserId: null,
      requesterUserIds: [],
      approverUserIds: [],
      latestAction: null,
    };
  }

  for (const row of history) {
    if (
      !row ||
      typeof row.action !== "string" ||
      !VALID_APPROVAL_HISTORY_ACTIONS.has(row.action)
    ) {
      return {
        isMalformed: true,
        hasPriorRejectionWithoutNewRequest: false,
        currentCycleEntries: [],
        requesterUserId: null,
        requesterUserIds: [],
        approverUserIds: [],
        latestAction: null,
      };
    }
  }

  let lastRejectedIndex = -1;
  for (let i = 0; i < history.length; i++) {
    if (history[i]!.action === "REJECTED") {
      lastRejectedIndex = i;
    }
  }

  const currentCycleEntries = (
    lastRejectedIndex >= 0 ? history.slice(lastRejectedIndex + 1) : history
  ).map((h) => ({
    action: h.action as string,
    performedByUserId:
      typeof h.performedByUserId === "string" ? h.performedByUserId.trim() : null,
    comment: h.comment ?? null,
  }));

  if (currentCycleEntries.length === 0) {
    return {
      isMalformed: false,
      hasPriorRejectionWithoutNewRequest: true,
      currentCycleEntries: [],
      requesterUserId: null,
      requesterUserIds: [],
      approverUserIds: [],
      latestAction: "REJECTED",
    };
  }

  const firstEntry = currentCycleEntries[0]!;
  if (firstEntry.action !== "REQUESTED" && firstEntry.action !== "RESUBMITTED") {
    return {
      isMalformed: true,
      hasPriorRejectionWithoutNewRequest: false,
      currentCycleEntries,
      requesterUserId: null,
      requesterUserIds: [],
      approverUserIds: [],
      latestAction: currentCycleEntries[currentCycleEntries.length - 1]!.action,
    };
  }

  const requesterUserIds: string[] = [];
  const approverUserIds: string[] = [];

  for (const entry of currentCycleEntries) {
    if (entry.action === "REQUESTED" || entry.action === "RESUBMITTED") {
      if (!isValidActorIdentity(entry.performedByUserId)) {
        return {
          isMalformed: true,
          hasPriorRejectionWithoutNewRequest: false,
          currentCycleEntries,
          requesterUserId: null,
          requesterUserIds: [],
          approverUserIds: [],
          latestAction: currentCycleEntries[currentCycleEntries.length - 1]!.action,
        };
      }
      if (!requesterUserIds.includes(entry.performedByUserId)) {
        requesterUserIds.push(entry.performedByUserId);
      }
    } else if (entry.action === "APPROVED" && entry.comment !== "Payroll posted") {
      if (!isValidActorIdentity(entry.performedByUserId)) {
        return {
          isMalformed: true,
          hasPriorRejectionWithoutNewRequest: false,
          currentCycleEntries,
          requesterUserId: null,
          requesterUserIds: [],
          approverUserIds: [],
          latestAction: currentCycleEntries[currentCycleEntries.length - 1]!.action,
        };
      }
      if (!approverUserIds.includes(entry.performedByUserId)) {
        approverUserIds.push(entry.performedByUserId);
      }
    }
  }

  const latestEntry = currentCycleEntries[currentCycleEntries.length - 1]!;
  const latestRequest = [...currentCycleEntries]
    .reverse()
    .find((h) => h.action === "REQUESTED" || h.action === "RESUBMITTED");

  return {
    isMalformed: false,
    hasPriorRejectionWithoutNewRequest: false,
    currentCycleEntries,
    requesterUserId: latestRequest?.performedByUserId ?? null,
    requesterUserIds,
    approverUserIds,
    latestAction: latestEntry.action,
  };
}

function assertValidApprovalCycleForApprove(
  payrollRunId: string,
  history:
    | Array<{
        action?: string | null;
        performedByUserId?: string | null;
        comment?: string | null;
      }>
    | null
    | undefined,
  approvedByUserId: string,
): CurrentCycleApprovalResolution {
  const cycle = resolveCurrentCycleApprovalHistory(history);
  if (
    cycle.isMalformed ||
    !cycle.requesterUserId ||
    (cycle.latestAction !== "REQUESTED" && cycle.latestAction !== "RESUBMITTED")
  ) {
    throwForbidden(
      "Approval requester identity is required to enforce Segregation of Duties",
      ERROR_CODES.FORBIDDEN,
      { payrollRunId },
    );
  }
  if (cycle.requesterUserIds.includes(approvedByUserId)) {
    throwForbidden(
      "Người yêu cầu phê duyệt không được tự phê duyệt bảng lương (Vi phạm Segregation of Duties)",
      ERROR_CODES.FORBIDDEN,
      {
        payrollRunId,
        requesterUserId: cycle.requesterUserId,
        approverUserId: approvedByUserId,
      },
    );
  }
  return cycle;
}

function assertValidApprovalCycleForPost(
  payrollRunId: string,
  run: { approvedByUserId?: string | null },
  history:
    | Array<{
        action?: string | null;
        performedByUserId?: string | null;
        comment?: string | null;
      }>
    | null
    | undefined,
  postedByUserId: string,
): CurrentCycleApprovalResolution {
  const cycle = resolveCurrentCycleApprovalHistory(history);
  if (
    cycle.isMalformed ||
    !cycle.requesterUserId ||
    cycle.latestAction === "REJECTED"
  ) {
    throwForbidden(
      "Approval requester identity is required to enforce Segregation of Duties",
      ERROR_CODES.FORBIDDEN,
      { payrollRunId },
    );
  }
  if (cycle.requesterUserIds.includes(postedByUserId)) {
    throwForbidden(
      "Người yêu cầu phê duyệt không được tự chốt bảng lương (Vi phạm Segregation of Duties)",
      ERROR_CODES.FORBIDDEN,
      {
        payrollRunId,
        requesterUserId: cycle.requesterUserId,
        postedByUserId,
      },
    );
  }
  if (run.approvedByUserId === "system") {
    throwForbidden(
      "Approver identity is required to enforce Segregation of Duties",
      ERROR_CODES.FORBIDDEN,
      { payrollRunId },
    );
  }
  if (
    (run.approvedByUserId && cycle.requesterUserIds.includes(run.approvedByUserId)) ||
    cycle.approverUserIds.some((approverId) => cycle.requesterUserIds.includes(approverId))
  ) {
    throwForbidden(
      "Người yêu cầu phê duyệt không được tự phê duyệt bảng lương (Vi phạm Segregation of Duties)",
      ERROR_CODES.FORBIDDEN,
      {
        payrollRunId,
        requesterUserId: cycle.requesterUserId,
        approverUserId: run.approvedByUserId ?? cycle.approverUserIds[0],
      },
    );
  }
  return cycle;
}

export const PAYROLL_CALCULATION_STATUS = {
  PROVISIONAL_POLICY_UNCONFIRMED: "PROVISIONAL_POLICY_UNCONFIRMED",
  CONFIRMED: "CONFIRMED",
} as const;

export type PayrollCalculationStatus =
  (typeof PAYROLL_CALCULATION_STATUS)[keyof typeof PAYROLL_CALCULATION_STATUS];

export function isProvisionalPayslipMetadata(metadata: unknown): {
  isProvisional: boolean;
  calculationStatus: string;
  policyBlockerCode?: string;
  unconfirmedComponents?: unknown[];
} {
  if (!metadata || typeof metadata !== "object") {
    return {
      isProvisional: true,
      calculationStatus: PAYROLL_CALCULATION_STATUS.PROVISIONAL_POLICY_UNCONFIRMED,
      policyBlockerCode: "BIZ_004_PAYROLL_POLICY_UNCONFIRMED",
      unconfirmedComponents: [],
    };
  }
  const meta = metadata as Record<string, unknown>;
  if (meta.calculationStatus === PAYROLL_CALCULATION_STATUS.PROVISIONAL_POLICY_UNCONFIRMED) {
    return {
      isProvisional: true,
      calculationStatus: PAYROLL_CALCULATION_STATUS.PROVISIONAL_POLICY_UNCONFIRMED,
      policyBlockerCode:
        typeof meta.policyBlockerCode === "string"
          ? meta.policyBlockerCode
          : "BIZ_004_PAYROLL_POLICY_UNCONFIRMED",
      unconfirmedComponents: Array.isArray(meta.unconfirmedPolicyComponents)
        ? meta.unconfirmedPolicyComponents
        : [],
    };
  }
  if (
    meta.isProvisional === true ||
    meta.settlementComplete === false ||
    meta.requiresManualReviewBeforePublish === true
  ) {
    return {
      isProvisional: true,
      calculationStatus:
        typeof meta.calculationStatus === "string"
          ? meta.calculationStatus
          : PAYROLL_CALCULATION_STATUS.PROVISIONAL_POLICY_UNCONFIRMED,
      policyBlockerCode:
        typeof meta.policyBlockerCode === "string"
          ? meta.policyBlockerCode
          : "BIZ_005_FINAL_SETTLEMENT_POLICY_UNCONFIRMED",
      unconfirmedComponents: Array.isArray(meta.omittedComponents)
        ? meta.omittedComponents
        : Array.isArray(meta.unconfirmedPolicyComponents)
          ? meta.unconfirmedPolicyComponents
          : [],
    };
  }
  if (meta.calculationStatus !== PAYROLL_CALCULATION_STATUS.CONFIRMED) {
    return {
      isProvisional: true,
      calculationStatus:
        typeof meta.calculationStatus === "string"
          ? meta.calculationStatus
          : PAYROLL_CALCULATION_STATUS.PROVISIONAL_POLICY_UNCONFIRMED,
      policyBlockerCode:
        typeof meta.policyBlockerCode === "string"
          ? meta.policyBlockerCode
          : "BIZ_004_PAYROLL_POLICY_UNCONFIRMED",
      unconfirmedComponents: Array.isArray(meta.unconfirmedPolicyComponents)
        ? meta.unconfirmedPolicyComponents
        : [],
    };
  }
  return {
    isProvisional: false,
    calculationStatus: PAYROLL_CALCULATION_STATUS.CONFIRMED,
  };
}

export function isProvisionalPayrollRunRecord(run: unknown): {
  isProvisional: boolean;
  calculationStatus?: string;
  policyBlockerCode?: string;
  unconfirmedComponents?: unknown[];
} {
  if (!run || typeof run !== "object") {
    return { isProvisional: false };
  }
  const runRecord = run as Record<string, unknown>;
  if (runRecord.metadata && typeof runRecord.metadata === "object") {
    return isProvisionalPayslipMetadata(runRecord.metadata);
  }
  if (
    runRecord.calculationStatus === PAYROLL_CALCULATION_STATUS.PROVISIONAL_POLICY_UNCONFIRMED ||
    runRecord.isProvisional === true ||
    runRecord.publicationStatus === PAYROLL_CALCULATION_STATUS.PROVISIONAL_POLICY_UNCONFIRMED
  ) {
    return {
      isProvisional: true,
      calculationStatus: PAYROLL_CALCULATION_STATUS.PROVISIONAL_POLICY_UNCONFIRMED,
      policyBlockerCode:
        typeof runRecord.policyBlockerCode === "string"
          ? runRecord.policyBlockerCode
          : "BIZ_004_PAYROLL_POLICY_UNCONFIRMED",
      unconfirmedComponents: [],
    };
  }
  return { isProvisional: false };
}

function formatPayrollOperationLabel(
  operation: "approve" | "post" | "export" | "finalize",
): string {
  switch (operation) {
    case "approve":
      return "approved";
    case "post":
      return "posted";
    case "export":
      return "exported or submitted for payment";
    case "finalize":
      return "finalized";
  }
}

export async function assertPayrollRunNotProvisional(
  id: string,
  run: unknown,
  repo: PayrollRunsRepository,
  operation: "approve" | "post" | "export" | "finalize",
  tx?: PayrollRunTransaction,
): Promise<void> {
  const opLabel = formatPayrollOperationLabel(operation);
  const runMetaCheck = isProvisionalPayrollRunRecord(run);
  if (runMetaCheck.isProvisional) {
    throwConflict(
      `Provisional payroll run cannot be ${opLabel} while HR/Finance payroll policies remain unconfirmed`,
      ERROR_CODES.INVALID_STATUS_TRANSITION,
      {
        payrollRunId: id,
        calculationStatus: runMetaCheck.calculationStatus,
        policyBlockerCode: runMetaCheck.policyBlockerCode,
        unconfirmedPolicyComponents: runMetaCheck.unconfirmedComponents ?? [],
      },
    );
  }

  if (typeof repo.findPayslipsByRunId !== "function") {
    throwConflict(
      `Payroll run payslips cannot be verified; refusing to allow run to be ${opLabel} without confirmed payslip calculations`,
      ERROR_CODES.INVALID_STATUS_TRANSITION,
      { payrollRunId: id },
    );
  }

  const runPayslips = await repo.findPayslipsByRunId(id, tx);
  if (runPayslips.length === 0) {
    throwConflict(
      `Payroll run has no generated payslips and cannot be ${opLabel}`,
      ERROR_CODES.INVALID_STATUS_TRANSITION,
      { payrollRunId: id },
    );
  }

  for (const payslip of runPayslips) {
    const check = isProvisionalPayslipMetadata(payslip.metadata);
    if (check.isProvisional) {
      throwConflict(
        `Provisional payroll run cannot be ${opLabel} while HR/Finance payroll policies remain unconfirmed`,
        ERROR_CODES.INVALID_STATUS_TRANSITION,
        {
          payrollRunId: id,
          payslipId: payslip.id,
          calculationStatus: check.calculationStatus,
          policyBlockerCode: check.policyBlockerCode,
          unconfirmedPolicyComponents: check.unconfirmedComponents ?? [],
        },
      );
    }
  }
}

export async function assertPayrollRunReadyForExportOrPayment(
  id: string,
  run: unknown,
  repo: PayrollRunsRepository,
  tx?: PayrollRunTransaction,
): Promise<void> {
  const runRecord = (run ?? {}) as Record<string, unknown>;
  if (runRecord.status !== "posted") {
    throwConflict(
      `Payroll run in '${String(runRecord.status ?? "unposted")}' status cannot be exported as final or submitted to payment integration; run must be 'posted'`,
      ERROR_CODES.INVALID_STATUS_TRANSITION,
      { payrollRunId: id, status: runRecord.status ?? null },
    );
  }
  if (!runRecord.calculationVersionId || !runRecord.calculationHash) {
    throwConflict(
      "Payroll run is missing immutable calculation provenance and cannot be exported as final or submitted to payment integration",
      ERROR_CODES.INVALID_STATUS_TRANSITION,
      { payrollRunId: id },
    );
  }
  await assertPayrollRunNotProvisional(id, run, repo, "export", tx);
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

    const normalizedApproverId =
      typeof approvedByUserId === "string" ? approvedByUserId.trim() : "";
    if (!isValidActorIdentity(normalizedApproverId)) {
      throwForbidden(
        "Approver identity is required to enforce Segregation of Duties",
        ERROR_CODES.FORBIDDEN,
        { payrollRunId: id },
      );
    }

    // Fast-fail pre-flight checks before opening transaction
    const history = await this.repo.getApprovalHistory(id);
    assertValidApprovalCycleForApprove(id, history, normalizedApproverId);
    await assertPayrollRunNotProvisional(id, run, this.repo, "approve");

    await this.repo.transaction(async (tx) => {
      let lockedRun: {
        id: string;
        status: string;
        approvedByUserId?: string | null;
      } | null = null;
      if (typeof this.repo.lockRunById === "function") {
        lockedRun = await this.repo.lockRunById(id, tx);
        if (!lockedRun) {
          throwNotFound("Payroll run not found", ERROR_CODES.PAYROLL_NOT_FOUND, {
            payrollRunId: id,
          });
        }
        if (lockedRun.status !== currentStatus) {
          throwConflict(
            "Payroll run was updated concurrently",
            ERROR_CODES.CONFLICT,
            { payrollRunId: id },
          );
        }
      }

      const txHistory = await this.repo.getApprovalHistory(id, tx);
      assertValidApprovalCycleForApprove(id, txHistory, normalizedApproverId);
      await assertPayrollRunNotProvisional(
        id,
        lockedRun ?? run,
        this.repo,
        "approve",
        tx,
      );

      const updated = await this.repo.updateStatusWithGuard(
        id,
        currentStatus,
        {
          status: "approved",
          approvedByUserId: normalizedApproverId,
          approvedAt: new Date(),
          processedAt: new Date(),
        } as any,
        tx,
      );
      if (!updated) {
        throwConflict(
          "Payroll run was updated concurrently",
          ERROR_CODES.CONFLICT,
          { payrollRunId: id },
        );
      }
      await this.repo.recordApprovalAction(
        id,
        "APPROVED",
        normalizedApproverId,
        comment ?? null,
        tx,
      );

      await this.eventOutbox.stage(
        new PayrollApprovedEvent({
          payrollRunId: id,
          approvedByUserId: normalizedApproverId,
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

    const normalizedRejectorId =
      typeof rejectedByUserId === "string" ? rejectedByUserId.trim() : "";
    if (!isValidActorIdentity(normalizedRejectorId)) {
      throwForbidden(
        "Rejector identity is required to enforce Segregation of Duties",
        ERROR_CODES.FORBIDDEN,
        { payrollRunId: id },
      );
    }

    await this.repo.transaction(async (tx) => {
      if (typeof this.repo.lockRunById === "function") {
        const lockedRun = await this.repo.lockRunById(id, tx);
        if (!lockedRun) {
          throwNotFound("Payroll run not found", ERROR_CODES.PAYROLL_NOT_FOUND, {
            payrollRunId: id,
          });
        }
        if (lockedRun.status !== currentStatus) {
          throwConflict(
            "Payroll run was updated concurrently",
            ERROR_CODES.CONFLICT,
            { payrollRunId: id },
          );
        }
      }

      const updated = await this.repo.updateStatusWithGuard(
        id,
        currentStatus,
        {
          status: "draft",
          approvedByUserId: null,
          approvedAt: null,
        } as any,
        tx,
      );
      if (!updated) {
        throwConflict(
          "Payroll run was updated concurrently",
          ERROR_CODES.CONFLICT,
          { payrollRunId: id },
        );
      }
      await this.repo.recordApprovalAction(
        id,
        "REJECTED",
        normalizedRejectorId,
        reason,
        tx,
      );

      await this.eventOutbox.stage(
        new PayrollRejectedEvent({
          payrollRunId: id,
          rejectedByUserId: normalizedRejectorId,
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

    const normalizedRequesterId =
      typeof requestedByUserId === "string" ? requestedByUserId.trim() : "";
    if (!isValidActorIdentity(normalizedRequesterId)) {
      throwForbidden(
        "Approval requester identity is required to enforce Segregation of Duties",
        ERROR_CODES.FORBIDDEN,
        { payrollRunId: id },
      );
    }

    const currentStatus = run.status as "draft" | "processing" | "pending_approval" | "approved" | "posted";
    this.stateMachine.assertTransition(currentStatus, "pending_approval");

    await this.repo.transaction(async (tx) => {
      if (typeof this.repo.lockRunById === "function") {
        const lockedRun = await this.repo.lockRunById(id, tx);
        if (!lockedRun) {
          throwNotFound("Payroll run not found", ERROR_CODES.PAYROLL_NOT_FOUND, {
            payrollRunId: id,
          });
        }
        if (lockedRun.status !== currentStatus) {
          throwConflict(
            "Payroll run was updated concurrently",
            ERROR_CODES.CONFLICT,
            { payrollRunId: id },
          );
        }
      }

      const updated = await this.repo.updateStatusWithGuard(
        id,
        currentStatus,
        { status: "pending_approval" } as any,
        tx,
      );
      if (!updated) {
        throwConflict(
          "Payroll run was updated concurrently",
          ERROR_CODES.CONFLICT,
          { payrollRunId: id },
        );
      }
      await this.repo.recordApprovalAction(
        id,
        "REQUESTED",
        normalizedRequesterId,
        null,
        tx,
      );
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

    const normalizedPosterId =
      typeof postedByUserId === "string" ? postedByUserId.trim() : "";
    if (!isValidActorIdentity(normalizedPosterId)) {
      throwForbidden(
        "Poster identity is required to enforce Segregation of Duties",
        ERROR_CODES.FORBIDDEN,
        { payrollRunId: id },
      );
    }

    // Fast-fail pre-flight checks before opening transaction
    const history = await this.repo.getApprovalHistory(id);
    assertValidApprovalCycleForPost(id, run, history, normalizedPosterId);

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

    await assertPayrollRunNotProvisional(id, run, this.repo, "post");

    await this.repo.transaction(async (tx) => {
      let lockedRun: {
        id: string;
        status: string;
        approvedByUserId: string | null;
        postedByUserId: string | null;
        calculationVersionId: string | null;
        calculationHash: string | null;
      } | null = null;
      if (typeof this.repo.lockRunById === "function") {
        lockedRun = await this.repo.lockRunById(id, tx);
        if (!lockedRun) {
          throwNotFound("Payroll run not found", ERROR_CODES.PAYROLL_NOT_FOUND, {
            payrollRunId: id,
          });
        }
        if (lockedRun.status !== currentStatus) {
          throwConflict(
            "Payroll run was updated concurrently",
            ERROR_CODES.CONFLICT,
            { payrollRunId: id },
          );
        }
        if (!lockedRun.calculationVersionId) {
          throwBadRequest(
            "Payroll run has no calculation version. Generate payroll before posting.",
            ERROR_CODES.INVALID_REQUEST,
          );
        }
        if (!lockedRun.calculationHash) {
          throwBadRequest(
            "Payroll run has no calculation hash. Generate payroll before posting.",
            ERROR_CODES.INVALID_REQUEST,
          );
        }
      }

      const txHistory = await this.repo.getApprovalHistory(id, tx);
      assertValidApprovalCycleForPost(
        id,
        lockedRun ?? run,
        txHistory,
        normalizedPosterId,
      );
      await assertPayrollRunNotProvisional(
        id,
        lockedRun ?? run,
        this.repo,
        "post",
        tx,
      );

      const updated = await this.repo.updateStatusWithGuard(
        id,
        currentStatus,
        {
          status: "posted",
          postedByUserId: normalizedPosterId,
          postedAt: new Date(),
          publicationStatus: "pending",
        } as any,
        tx,
      );
      if (!updated) {
        throwConflict(
          "Payroll run was updated concurrently",
          ERROR_CODES.CONFLICT,
          { payrollRunId: id },
        );
      }

      if (typeof this.repo.lockRunInputSnapshots === "function") {
        await this.repo.lockRunInputSnapshots(id, tx);
      }

      await this.repo.recordApprovalAction(
        id,
        "APPROVED",
        normalizedPosterId,
        "Payroll posted",
        tx,
      );

      await this.eventOutbox.stage(
        new PayrollPostedEvent({
          payrollRunId: id,
          postedByUserId: normalizedPosterId,
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
