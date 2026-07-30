import { Injectable } from "@nestjs/common";
import { AttendanceTimekeepingRepository } from "../repositories/attendance-timekeeping.repository";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { AttendanceAdjustmentRequestedEvent } from "../../../../core/events/events/attendance-adjustment-requested.event";
import { AttendanceAdjustmentApprovedEvent } from "../../../../core/events/events/attendance-adjustment-approved.event";
import { AttendanceAdjustmentRejectedEvent } from "../../../../core/events/events/attendance-adjustment-rejected.event";
import { AttendanceAdjustmentAppliedEvent } from "../../../../core/events/events/attendance-adjustment-applied.event";
import { AttendancePeriodLockService } from "./attendance-period-lock.service";

export type AdjustmentStatus = "draft" | "requested" | "under_review" | "approved" | "rejected" | "applied";
export type AdjustmentField = "REGULAR_HOURS" | "OVERTIME_HOURS" | "WORKING_DAY_STATUS";

export type AdjustmentItemInput = {
  fieldName: AdjustmentField;
  oldValue: number;
  newValue: number;
  delta: number;
};

export type AdjustmentInput = {
  period: string;
  employeeId: string;
  reason: string;
  items: AdjustmentItemInput[];
};

export type AdjustmentHeader = {
  id: string;
  period: string;
  employeeId: string;
  status: AdjustmentStatus;
  reason: string;
  requestedByUserId: string | null;
  requestedAt: Date | null;
  approvedByUserId: string | null;
  approvedAt: Date | null;
  rejectionReason: string | null;
  appliedAt: Date | null;
};

export type AdjustmentItem = {
  id: string;
  adjustmentId: string;
  fieldName: AdjustmentField;
  oldValue: number;
  newValue: number;
  delta: number;
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ["requested"],
  requested: ["under_review", "cancelled"],
  under_review: ["approved", "rejected"],
  approved: ["applied"],
  rejected: [],
  applied: [],
};

@Injectable()
export class AttendanceAdjustmentService {
  constructor(
    private readonly timekeepingRepo: AttendanceTimekeepingRepository,
    private readonly eventOutbox: EventOutboxService,
    private readonly periodLockService: AttendancePeriodLockService,
  ) {}

  private assertTransition(from: string, to: string) {
    const allowed = STATUS_TRANSITIONS[from];
    if (!allowed?.includes(to)) {
      throw new Error(`Invalid adjustment transition: ${from} → ${to}`);
    }
  }

  async create(input: AdjustmentInput, actorUserId: string): Promise<AdjustmentHeader> {
    // Validate period exists and is closed
    const lock = await this.timekeepingRepo.findPeriodLock(input.period);
    if (!lock) throw new Error("Period not found");
    if (!this.periodLockService.isClosed(lock.status)) {
      throw new Error("Adjustments can only be created for closed periods");
    }

    // Validate snapshot exists for this employee in period
    const snapshot = await this.timekeepingRepo.findSnapshot(input.period, input.employeeId);
    if (!snapshot) throw new Error("No attendance snapshot found for employee in this period");

    // Atomic: header + items + event
    return this.timekeepingRepo.transaction(async (tx) => {
      const header = await this.timekeepingRepo.insertAdjustment({
        period: input.period,
        employeeId: input.employeeId,
        status: "requested",
        reason: input.reason,
        requestedByUserId: actorUserId,
        requestedAt: new Date(),
      }, tx);
      if (!header) throw new Error("Failed to create adjustment");

      if (input.items.length > 0) {
        await this.timekeepingRepo.insertAdjustmentItems(
          input.items.map((item) => ({
            adjustmentId: header.id,
            fieldName: item.fieldName,
            oldValue: item.oldValue,
            newValue: item.newValue,
            delta: item.delta,
          })),
          tx,
        );
      }

      await this.eventOutbox.stage(
        new AttendanceAdjustmentRequestedEvent({
          period: input.period,
          adjustmentId: header.id,
          employeeId: input.employeeId,
          requestedByUserId: actorUserId,
        }),
      );

      return this.toHeader(header);
    });
  }

  async approve(id: string, approvedByUserId: string): Promise<AdjustmentHeader> {
    const existing = await this.findById(id);
    if (!existing) throw new Error("Adjustment not found");
    this.assertTransition(existing.status, "approved");

    return this.timekeepingRepo.transaction(async (tx) => {
      const updated = await this.timekeepingRepo.updateAdjustment(id, {
        status: "approved",
        approvedByUserId,
        approvedAt: new Date(),
      }, tx);

      if (!updated) throw new Error("Failed to approve adjustment");

      await this.eventOutbox.stage(
        new AttendanceAdjustmentApprovedEvent({
          adjustmentId: id,
          period: updated.period,
          approvedByUserId,
        }),
      );

      return this.toHeader(updated);
    });
  }

  async reject(id: string, rejectedByUserId: string, reason: string): Promise<AdjustmentHeader> {
    const existing = await this.findById(id);
    if (!existing) throw new Error("Adjustment not found");
    this.assertTransition(existing.status, "rejected");

    return this.timekeepingRepo.transaction(async (tx) => {
      const updated = await this.timekeepingRepo.updateAdjustment(id, {
        status: "rejected",
        rejectionReason: reason,
      }, tx);

      if (!updated) throw new Error("Failed to reject adjustment");

      await this.eventOutbox.stage(
        new AttendanceAdjustmentRejectedEvent({
          adjustmentId: id,
          period: updated.period,
          rejectedByUserId,
          reason,
        }),
      );

      return this.toHeader(updated);
    });
  }

  async apply(id: string): Promise<AdjustmentHeader> {
    const existing = await this.findById(id);
    if (!existing) throw new Error("Adjustment not found");
    this.assertTransition(existing.status, "applied");

    return this.timekeepingRepo.transaction(async (tx) => {
      const updated = await this.timekeepingRepo.updateAdjustment(id, {
        status: "applied",
        appliedAt: new Date(),
      }, tx);

      if (!updated) throw new Error("Failed to apply adjustment");

      await this.eventOutbox.stage(
        new AttendanceAdjustmentAppliedEvent({
          adjustmentId: id,
          period: updated.period,
        }),
      );

      return this.toHeader(updated);
    });
  }

  async findById(id: string): Promise<(AdjustmentHeader & { items: AdjustmentItem[] }) | null> {
    const row = await this.timekeepingRepo.findAdjustmentById(id);
    if (!row) return null;

    return {
      ...this.toHeader(row),
      items: (row.items ?? []).map((item: any) => ({
        id: item.id,
        adjustmentId: item.adjustmentId,
        fieldName: item.fieldName as AdjustmentField,
        oldValue: item.oldValue,
        newValue: item.newValue,
        delta: item.delta,
      })),
    };
  }

  async list(period?: string, employeeId?: string): Promise<AdjustmentHeader[]> {
    const rows = await this.timekeepingRepo.listAdjustments(period, employeeId);
    return rows.map((row) => this.toHeader(row));
  }

  /** Get the effective delta from all applied adjustments for an employee in a period */
  async getEffectiveDelta(period: string, employeeId: string): Promise<Map<string, number>> {
    const adjustments = await this.timekeepingRepo.findAppliedAdjustmentsWithItems(period, employeeId);

    const delta = new Map<string, number>();
    for (const adj of adjustments) {
      for (const item of adj.items ?? []) {
        const key = item.fieldName;
        delta.set(key, (delta.get(key) ?? 0) + item.delta);
      }
    }
    return delta;
  }

  private toHeader(row: any): AdjustmentHeader {
    return {
      id: row.id,
      period: row.period,
      employeeId: row.employeeId,
      status: row.status as AdjustmentStatus,
      reason: row.reason,
      requestedByUserId: row.requestedByUserId ?? null,
      requestedAt: row.requestedAt ?? null,
      approvedByUserId: row.approvedByUserId ?? null,
      approvedAt: row.approvedAt ?? null,
      rejectionReason: row.rejectionReason ?? null,
      appliedAt: row.appliedAt ?? null,
    };
  }
}

