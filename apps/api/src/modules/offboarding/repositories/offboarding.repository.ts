import { offboardingClearances, offboardingSettlementLinks, exitInterviews, boardingChecklistItems, boardingProcesses } from "../../../infrastructure/database/schema";
import { OffboardingCompletedEvent } from "../domain/events/offboarding-completed.event";
import { Injectable, Inject } from "@nestjs/common";
import { eq, and, isNull } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";
import type { AppDatabase } from "../../../infrastructure/database/database-client.type";

export type ClearanceDepartment = "it" | "hr" | "finance" | "manager" | "security";
export type ClearanceDecision = "pending" | "approved" | "rejected";
export type SettlementStatus = "pending" | "processing" | "settled" | "failed";

export interface ClearanceRecord {
  id: string;
  processId: string;
  department: ClearanceDepartment;
  decision: ClearanceDecision;
  decidedByUserId: string | null;
  note: string | null;
  decidedAt: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SettlementLinkRecord {
  id: string;
  processId: string;
  employeeId: string;
  status: SettlementStatus;
  payrollRef: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const REQUIRED_DEPARTMENTS: ClearanceDepartment[] = [
  "it", "hr", "finance", "manager", "security",
];

@Injectable()
export class OffboardingRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: AppDatabase,
  ) {}

  /* ─── Clearances ──────────────────────────────────────────── */

  async seedClearances(
    processId: string,
    tx?: AppDatabase,
  ): Promise<ClearanceRecord[]> {
    const target = tx ?? this.db;
    const values = REQUIRED_DEPARTMENTS.map((dept) => ({
      processId,
      department: dept,
      decision: "pending" as const,
    }));
    const rows = await target
      .insert(offboardingClearances)
      .values(values)
      .returning();
    return rows.map(this.mapClearance);
  }

  async findClearancesByProcessId(
    processId: string,
  ): Promise<ClearanceRecord[]> {
    const rows = await this.db
      .select()
      .from(offboardingClearances)
      .where(
        and(
          eq(offboardingClearances.processId, processId),
          isNull(offboardingClearances.deletedAt),
        ),
      );
    return rows.map(this.mapClearance);
  }

  async findClearanceByProcessAndDepartment(
    processId: string,
    department: ClearanceDepartment,
  ): Promise<ClearanceRecord | null> {
    const [row] = await this.db
      .select()
      .from(offboardingClearances)
      .where(
        and(
          eq(offboardingClearances.processId, processId),
          eq(offboardingClearances.department, department),
          isNull(offboardingClearances.deletedAt),
        ),
      )
      .limit(1);
    return row ? this.mapClearance(row) : null;
  }

  async decideClearance(
    id: string,
    decision: ClearanceDecision,
    decidedByUserId: string,
    note?: string,
  ): Promise<ClearanceRecord | null> {
    const [row] = await this.db
      .update(offboardingClearances)
      .set({
        decision,
        decidedByUserId,
        note: note ?? null,
        decidedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(offboardingClearances.id, id))
      .returning();
    return row ? this.mapClearance(row) : null;
  }

  async allClearancesApproved(processId: string): Promise<boolean> {
    const rows = await this.findClearancesByProcessId(processId);
    return rows.length > 0 && rows.every((r) => r.decision === "approved");
  }

  async getOutstandingClearances(
    processId: string,
  ): Promise<ClearanceRecord[]> {
    const rows = await this.findClearancesByProcessId(processId);
    return rows.filter((r) => r.decision !== "approved");
  }

  /* ─── Settlement Links ────────────────────────────────────── */

  async upsertSettlementLink(
    processId: string,
    employeeId: string,
    tx?: AppDatabase,
  ): Promise<SettlementLinkRecord> {
    const target = tx ?? this.db;
    const [existing] = await target
      .select()
      .from(offboardingSettlementLinks)
      .where(eq(offboardingSettlementLinks.processId, processId))
      .limit(1);

    if (existing) {
      return this.mapSettlementLink(existing);
    }

    const [row] = await target
      .insert(offboardingSettlementLinks)
      .values({ processId, employeeId })
      .returning();
    return this.mapSettlementLink(row!);
  }

  async findSettlementByProcessId(
    processId: string,
  ): Promise<SettlementLinkRecord | null> {
    const [row] = await this.db
      .select()
      .from(offboardingSettlementLinks)
      .where(eq(offboardingSettlementLinks.processId, processId))
      .limit(1);
    return row ? this.mapSettlementLink(row) : null;
  }

  async updateSettlementStatus(
    processId: string,
    status: SettlementStatus,
    payrollRef?: string,
  ): Promise<SettlementLinkRecord | null> {
    const [row] = await this.db
      .update(offboardingSettlementLinks)
      .set({
        status,
        payrollRef: payrollRef ?? null,
        updatedAt: new Date(),
      })
      .where(eq(offboardingSettlementLinks.processId, processId))
      .returning();
    return row ? this.mapSettlementLink(row) : null;
  }

  /* ─── Exit Interviews ──────────────────────────────────────── */

  async findExitInterviewByProcessId(
    processId: string,
  ): Promise<{ id: string; scheduledAt: Date | null; conductedAt: Date | null } | null> {
    const [row] = await this.db
      .select({
        id: exitInterviews.id,
        scheduledAt: exitInterviews.scheduledAt,
        conductedAt: exitInterviews.conductedAt,
      })
      .from(exitInterviews)
      .where(
        and(
          eq(exitInterviews.processId, processId),
          isNull(exitInterviews.deletedAt),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  /* ─── Checklist Items ─────────────────────────────────────── */

  async updateChecklistItemStatus(
    id: string,
    status: "pending" | "in_progress" | "completed" | "skipped",
    completedByUserId?: string,
  ): Promise<void> {
    const now = new Date();
    await this.db
      .update(boardingChecklistItems)
      .set({
        status,
        isCompleted: status === "completed",
        completedAt: status === "completed" ? now : null,
        completedByUserID: status === "completed" ? completedByUserId ?? null : null,
        updatedAt: now,
      })
      .where(eq(boardingChecklistItems.id, id));
  }

  async updateProcessStatus(
    processId: string,
    status: "pending" | "in_progress" | "completed" | "cancelled" | "terminated",
  ): Promise<void> {
    await this.db
      .update(boardingProcesses)
      .set({ status, updatedAt: new Date() })
      .where(eq(boardingProcesses.id, processId));
  }

  async completeProcess(processId: string, tx?: AppDatabase): Promise<void> {
    const now = new Date();
    const target = tx ?? this.db;
    await target
      .update(boardingProcesses)
      .set({ status: "completed", completedAt: now, updatedAt: now })
      .where(eq(boardingProcesses.id, processId));
  }

  async createExitInterview(
    processId: string,
    employeeId: string,
    interviewerUserId: string,
    scheduledAt: string,
  ): Promise<{ id: string }> {
    const [row] = await this.db
      .insert(exitInterviews)
      .values({
        processId,
        employeeId,
        interviewerUserId,
        scheduledAt: new Date(scheduledAt),
      })
      .returning({ id: exitInterviews.id });
    return { id: row!.id };
  }

  async updateExitInterview(
    id: string,
    interviewerUserId: string,
    scheduledAt: string,
  ): Promise<void> {
    await this.db
      .update(exitInterviews)
      .set({
        interviewerUserId,
        scheduledAt: new Date(scheduledAt),
        updatedAt: new Date(),
      })
      .where(eq(exitInterviews.id, id));
  }

  async recordExitInterview(
    id: string,
    responses: Record<string, unknown> | null,
    notes: string | null,
  ): Promise<{ id: string; conductedAt: string }> {
    const now = new Date();
    const [row] = await this.db
      .update(exitInterviews)
      .set({
        responses,
        notes,
        conductedAt: now,
        updatedAt: now,
      })
      .where(eq(exitInterviews.id, id))
      .returning({ id: exitInterviews.id, conductedAt: exitInterviews.conductedAt });
    return { id: row!.id, conductedAt: now.toISOString() };
  }

  async findScheduledExitInterview(
    processId: string,
  ): Promise<{ id: string } | null> {
    const [row] = await this.db
      .select({ id: exitInterviews.id })
      .from(exitInterviews)
      .where(
        and(
          eq(exitInterviews.processId, processId),
          isNull(exitInterviews.conductedAt),
          isNull(exitInterviews.deletedAt),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async completeProcessWithSettlement(
    processId: string,
    employeeId: string,
    outbox: { stage: (event: unknown, tx?: any) => Promise<unknown> },
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      await this.completeProcess(processId, tx);
      await this.upsertSettlementLink(processId, employeeId, tx);

      const event = new OffboardingCompletedEvent({ processId, employeeId });
      await outbox.stage(event, tx);
    });
  }

  /* ─── Helpers ─────────────────────────────────────────────── */

  private mapClearance(row: Record<string, unknown>): ClearanceRecord {
    return {
      id: row.id as string,
      processId: row.processId as string,
      department: row.department as ClearanceDepartment,
      decision: row.decision as ClearanceDecision,
      decidedByUserId: row.decidedByUserId as string | null,
      note: row.note as string | null,
      decidedAt: row.decidedAt ? new Date(row.decidedAt as string).toISOString() : null,
      createdAt: row.createdAt as Date,
      updatedAt: row.updatedAt as Date,
    };
  }

  private mapSettlementLink(row: Record<string, unknown>): SettlementLinkRecord {
    return {
      id: row.id as string,
      processId: row.processId as string,
      employeeId: row.employeeId as string,
      status: row.status as SettlementStatus,
      payrollRef: row.payrollRef as string | null,
      createdAt: row.createdAt as Date,
      updatedAt: row.updatedAt as Date,
    };
  }
}
