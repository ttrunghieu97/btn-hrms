import { Injectable } from "@nestjs/common";
import { AttendanceTimekeepingRepository } from "../repositories/attendance-timekeeping.repository";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { AttendancePayrollReconciliationStartedEvent } from "../../../../core/events/events/attendance-payroll-reconciliation-started.event";
import { AttendancePayrollReconciliationCompletedEvent } from "../../../../core/events/events/attendance-payroll-reconciliation-completed.event";

export type DiffType =
  | "MATCH"
  | "MISSING_ATTENDANCE_SNAPSHOT"
  | "MISSING_PAYROLL_INPUT"
  | "REGULAR_HOURS_MISMATCH"
  | "OVERTIME_MISMATCH"
  | "EMPLOYEE_NOT_FOUND"
  | "DUPLICATE_RECORD";

export type ReconciliationStatus = "pending" | "running" | "completed" | "failed";

export type ReconciliationSummary = {
  id: string;
  period: string;
  status: ReconciliationStatus;
  totalEmployees: number;
  matchedCount: number;
  mismatchCount: number;
  checkedByUserId: string | null;
  checkedAt: Date;
  completedAt: Date | null;
  failureReason: string | null;
};

export type ReconciliationItem = {
  id: string;
  reconciliationId: string;
  employeeId: string;
  attendanceRegularHours: number;
  payrollRegularHours: number;
  attendanceOvertimeHours: number;
  payrollOvertimeHours: number;
  diffType: DiffType;
};

/**
 * Read-only reconciliation between Attendance Snapshot and Payroll results.
 *
 * Compares closed-period attendance snapshots against payroll calculations.
 * Never writes to attendance or payroll tables — detects divergence only.
 */
@Injectable()
export class PayrollReconciliationService {
  constructor(
    private readonly timekeepingRepo: AttendanceTimekeepingRepository,
    private readonly eventOutbox: EventOutboxService,
  ) {}

  async runReconciliation(
    period: string,
    actorUserId: string,
  ): Promise<ReconciliationSummary> {
    // Create reconciliation run record
    const run = await this.timekeepingRepo.insertPayrollReconciliationRun({
      period,
      status: "running",
      checkedByUserId: actorUserId,
    });
    if (!run) throw new Error("Failed to create reconciliation run");

    await this.eventOutbox.stage(
      new AttendancePayrollReconciliationStartedEvent({ period, reconciliationId: run.id }),
    );

    try {
      const items = await this.computeComparison(period, run.id);

      const matchedCount = items.filter((i) => i.diffType === "MATCH").length;
      const mismatchCount = items.length - matchedCount;

      const updated = await this.timekeepingRepo.updatePayrollReconciliationRun(run.id, {
        status: "completed",
        totalEmployees: items.length,
        matchedCount,
        mismatchCount,
        completedAt: new Date(),
      });

      await this.eventOutbox.stage(
        new AttendancePayrollReconciliationCompletedEvent({
          period,
          reconciliationId: run.id,
          totalEmployees: items.length,
          matchedCount,
          mismatchCount,
        }),
      );

      return this.toSummary(updated!);
    } catch (err: any) {
      const failed = await this.timekeepingRepo.updatePayrollReconciliationRun(run.id, {
        status: "failed",
        failureReason: err?.message ?? "Unknown error",
        completedAt: new Date(),
      });

      return this.toSummary(failed!);
    }
  }

  private async computeComparison(
    period: string,
    reconciliationId: string,
  ): Promise<ReconciliationItem[]> {
    const [year, month] = period.split("-").map(Number);
    if (!year || !month) return [];

    // 1. Get attendance snapshots for this period
    const snapshots = await this.timekeepingRepo.findTimesheetSnapshotsForPeriod(period);

    if (snapshots.length === 0) {
      return [];
    }

    const employeeIds = snapshots.map((s) => s.employeeId);

    // 2. Get payroll items for these employees in this period
    const payrollItems = await this.timekeepingRepo.findPayrollItemsForEmployees(employeeIds);

    const payrollByEmployee = new Map<string, { overtimeMinutes: number; workedMinutes: number }>();
    for (const item of payrollItems) {
      const existing = payrollByEmployee.get(item.employeeId) ?? { overtimeMinutes: 0, workedMinutes: 0 };
      if (item.code === "overtime") {
        existing.overtimeMinutes += Number(item.quantity ?? 0) * 60;
      }
      if (item.code === "base_salary") {
        if (item.metadata && typeof item.metadata === "object" && "workedMinutes" in item.metadata) {
          existing.workedMinutes = Number((item.metadata as any).workedMinutes ?? 0);
        }
      }
      payrollByEmployee.set(item.employeeId, existing);
    }

    // 3. Compare
    const items: ReconciliationItem[] = [];

    for (const snap of snapshots) {
      const payroll = payrollByEmployee.get(snap.employeeId);
      const attRegularHours = Math.round(snap.workedMinutes / 60);
      const attOvertimeHours = Math.round(snap.overtimeMinutes / 60);

      if (!payroll) {
        items.push({
          id: "",
          reconciliationId,
          employeeId: snap.employeeId,
          attendanceRegularHours: attRegularHours,
          payrollRegularHours: 0,
          attendanceOvertimeHours: attOvertimeHours,
          payrollOvertimeHours: 0,
          diffType: "MISSING_PAYROLL_INPUT",
        });
        continue;
      }

      const payRegularHours = Math.round(payroll.workedMinutes / 60);
      const payOvertimeHours = Math.round(payroll.overtimeMinutes / 60);

      let diffType: DiffType = "MATCH";
      if (attRegularHours !== payRegularHours) {
        diffType = "REGULAR_HOURS_MISMATCH";
      } else if (attOvertimeHours !== payOvertimeHours) {
        diffType = "OVERTIME_MISMATCH";
      }

      items.push({
        id: "",
        reconciliationId,
        employeeId: snap.employeeId,
        attendanceRegularHours: attRegularHours,
        payrollRegularHours: payRegularHours,
        attendanceOvertimeHours: attOvertimeHours,
        payrollOvertimeHours: payOvertimeHours,
        diffType,
      });
    }

    // 4. Find payroll-only employees (present in payroll but missing from attendance)
    const snapEmployeeIds = new Set(snapshots.map((s) => s.employeeId));
    for (const [empId] of payrollByEmployee) {
      if (!snapEmployeeIds.has(empId)) {
        items.push({
          id: "",
          reconciliationId,
          employeeId: empId,
          attendanceRegularHours: 0,
          payrollRegularHours: 0,
          attendanceOvertimeHours: 0,
          payrollOvertimeHours: 0,
          diffType: "MISSING_ATTENDANCE_SNAPSHOT",
        });
      }
    }

    // Batch insert items
    if (items.length > 0) {
      await this.timekeepingRepo.insertPayrollReconciliationItems(
        items.map((item) => ({
          reconciliationId,
          employeeId: item.employeeId,
          attendanceRegularHours: item.attendanceRegularHours,
          payrollRegularHours: item.payrollRegularHours,
          attendanceOvertimeHours: item.attendanceOvertimeHours,
          payrollOvertimeHours: item.payrollOvertimeHours,
          diffType: item.diffType,
        })),
      );
    }

    return items;
  }

  async getReconciliation(id: string): Promise<ReconciliationSummary | null> {
    const row = await this.timekeepingRepo.findPayrollReconciliation(id);
    if (!row) return null;
    return this.toSummary(row);
  }

  async getReconciliationItems(
    reconciliationId: string,
    diffType?: DiffType,
  ): Promise<ReconciliationItem[]> {
    const rows = await this.timekeepingRepo.listPayrollReconciliationItems(reconciliationId, diffType);

    return rows.map((row) => ({
      id: row.id,
      reconciliationId: row.reconciliationId,
      employeeId: row.employeeId,
      attendanceRegularHours: row.attendanceRegularHours,
      payrollRegularHours: row.payrollRegularHours,
      attendanceOvertimeHours: row.attendanceOvertimeHours,
      payrollOvertimeHours: row.payrollOvertimeHours,
      diffType: row.diffType as DiffType,
    }));
  }

  async listReconciliations(period?: string): Promise<ReconciliationSummary[]> {
    const rows = await this.timekeepingRepo.listPayrollReconciliations(period);
    return rows.map((row) => this.toSummary(row));
  }

  private toSummary(row: any): ReconciliationSummary {
    return {
      id: row.id,
      period: row.period,
      status: row.status as ReconciliationStatus,
      totalEmployees: row.totalEmployees ?? 0,
      matchedCount: row.matchedCount ?? 0,
      mismatchCount: row.mismatchCount ?? 0,
      checkedByUserId: row.checkedByUserId ?? null,
      checkedAt: row.checkedAt,
      completedAt: row.completedAt ?? null,
      failureReason: row.failureReason ?? null,
    };
  }
}

