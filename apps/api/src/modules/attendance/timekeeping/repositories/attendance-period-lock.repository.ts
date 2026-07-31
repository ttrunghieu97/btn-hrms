import { Inject, Injectable } from "@nestjs/common";
import { and, count, eq, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import * as schema from "../../../../infrastructure/database/schema";
import {
  AttendancePeriodStatus,
  AttendancePeriodLock,
  ATTENDANCE_PERIOD_STATUS_OPEN,
} from "../services/attendance-period-lock.service";
import {
  attendancePeriodLocks,
  attendancePeriodEmployeeVerification,
} from "../../../../infrastructure/database/schema/attendance/tables";

type PeriodLockInsert = typeof schema.attendancePeriodLocks.$inferInsert;

export type PeriodTransitionRecord = {
  id: string;
  period: string;
  fromStatus: string;
  toStatus: string;
  changedByUserId: string | null;
  reason: string | null;
  createdAt: Date;
};

@Injectable()
export class AttendancePeriodLockRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async transaction<T>(fn: (tx: PostgresJsDatabase<typeof schema>) => Promise<T>): Promise<T> {
    return this.db.transaction(fn);
  }

  async findByPeriod(period: string, tx?: AppDatabase): Promise<AttendancePeriodLock | null> {
    const db = tx ?? this.db;
    const row = await db
      .select()
      .from(attendancePeriodLocks)
      .where(eq(attendancePeriodLocks.period, period))
      .limit(1);

    if (!row.length) return null;
    return this.toDomain(row[0]!);
  }

  async upsert(params: {
    period: string;
    status: AttendancePeriodStatus;
    userId: string | null;
    remarks?: string;
  }, tx?: AppDatabase): Promise<AttendancePeriodLock> {
    const db = tx ?? this.db;
    const existing = await this.findByPeriod(params.period, tx);

    if (existing) {
      const updateData: Partial<PeriodLockInsert> = {
        status: params.status,
        updatedAt: new Date(),
      };

      if (params.status === "locked" && params.userId) {
        updateData.lockedByUserId = params.userId;
        updateData.lockedAt = new Date();
      }
      if (params.status === "open" && params.userId) {
        updateData.unlockedByUserId = params.userId;
        updateData.unlockedAt = new Date();
      }
      if (params.remarks !== undefined) {
        updateData.remarks = params.remarks;
      }

      const [row] = await db
        .update(attendancePeriodLocks)
        .set(updateData)
        .where(eq(attendancePeriodLocks.id, existing.id))
        .returning();
      return this.toDomain(row!);
    }

    const insertData: PeriodLockInsert = {
      period: params.period,
      status: params.status,
      lockedByUserId: params.status === "locked" ? params.userId : null,
      lockedAt: params.status === "locked" ? new Date() : null,
      remarks: params.remarks ?? null,
    };

    const [row] = await db
      .insert(attendancePeriodLocks)
      .values(insertData)
      .returning();
    return this.toDomain(row!);
  }

  async ensurePeriod(period: string): Promise<AttendancePeriodLock> {
    const existing = await this.findByPeriod(period);
    if (existing) return existing;

    const [row] = await this.db
      .insert(attendancePeriodLocks)
      .values({
        period,
        status: ATTENDANCE_PERIOD_STATUS_OPEN,
      })
      .returning();
    return this.toDomain(row!);
  }

  async recordTransition(params: {
    period: string;
    fromStatus: AttendancePeriodStatus;
    toStatus: AttendancePeriodStatus;
    changedByUserId: string | null;
    reason?: string;
    metadata?: Record<string, unknown>;
  }, tx?: AppDatabase): Promise<void> {
    const db = tx ?? this.db;
    await db.insert(schema.attendancePeriodHistory).values({
      period: params.period,
      fromStatus: params.fromStatus,
      toStatus: params.toStatus,
      changedByUserId: params.changedByUserId,
      reason: params.reason ?? null,
      metadata: (params.metadata ?? null),
    });
  }

  async getHistory(period: string): Promise<PeriodTransitionRecord[]> {
    const rows = await this.db
      .select()
      .from(schema.attendancePeriodHistory)
      .where(eq(schema.attendancePeriodHistory.period, period))
      .orderBy(schema.attendancePeriodHistory.createdAt);

    return rows.map((row) => ({
      id: row.id,
      period: row.period,
      fromStatus: row.fromStatus,
      toStatus: row.toStatus,
      changedByUserId: row.changedByUserId,
      reason: row.reason,
      createdAt: row.createdAt,
    }));
  }

  // ─── Employee verification status ──────────────────────────────────

  async ensureEmployeeVerification(
    period: string,
    employeeId: string,
    tx?: AppDatabase,
  ) {
    const db = tx ?? this.db;
    const existing = await db.query.attendancePeriodEmployeeVerification.findFirst({
      where: and(
        eq(attendancePeriodEmployeeVerification.period, period),
        eq(attendancePeriodEmployeeVerification.employeeId, employeeId),
      ),
    });
    if (existing) return existing;

    const [row] = await db
      .insert(attendancePeriodEmployeeVerification)
      .values({ period, employeeId })
      .returning();
    return row ?? null;
  }

  async markEmployeeVerified(
    period: string,
    employeeId: string,
    userId: string,
    tx?: AppDatabase,
  ) {
    const db = tx ?? this.db;
    const [row] = await db
      .update(attendancePeriodEmployeeVerification)
      .set({ status: "done", verifiedByUserId: userId, verifiedAt: new Date(), updatedAt: new Date() })
      .where(and(
        eq(attendancePeriodEmployeeVerification.period, period),
        eq(attendancePeriodEmployeeVerification.employeeId, employeeId),
      ))
      .returning();
    return row ?? null;
  }

  async unverifyEmployee(
    period: string,
    employeeId: string,
    tx?: AppDatabase,
  ) {
    const db = tx ?? this.db;
    const [row] = await db
      .update(attendancePeriodEmployeeVerification)
      .set({ status: "draft", verifiedByUserId: null, verifiedAt: null, updatedAt: new Date() })
      .where(and(
        eq(attendancePeriodEmployeeVerification.period, period),
        eq(attendancePeriodEmployeeVerification.employeeId, employeeId),
      ))
      .returning();
    return row ?? null;
  }

  async listEmployeeVerification(period: string, tx?: AppDatabase) {
    const db = tx ?? this.db;
    return db.query.attendancePeriodEmployeeVerification.findMany({
      where: eq(attendancePeriodEmployeeVerification.period, period),
    });
  }

  async countUnverifiedInPeriod(period: string, tx?: AppDatabase): Promise<number> {
    const db = tx ?? this.db;
    const [row] = await db
      .select({ value: count() })
      .from(attendancePeriodEmployeeVerification)
      .where(and(
        eq(attendancePeriodEmployeeVerification.period, period),
        eq(attendancePeriodEmployeeVerification.status, "draft"),
      ));
    return Number(row?.value ?? 0);
  }

  private toDomain(row: Record<string, any>): AttendancePeriodLock {
    return {
      id: row.id,
      period: row.period,
      status: row.status as AttendancePeriodStatus,
      lockedByUserId: row.lockedByUserId ?? null,
      lockedAt: row.lockedAt ?? null,
      unlockedByUserId: row.unlockedByUserId ?? null,
      unlockedAt: row.unlockedAt ?? null,
      remarks: row.remarks ?? null,
    };
  }
}
