import { Inject, Injectable } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import * as schema from "../../../../infrastructure/database/schema";
import {
  AttendancePeriodStatus,
  AttendancePeriodLock,
  ATTENDANCE_PERIOD_STATUS_OPEN,
} from "../services/attendance-period-lock.service";
import { attendancePeriodLocks } from "../../../../infrastructure/database/schema/attendance/tables";

type PeriodLockInsert = typeof schema.attendancePeriodLocks.$inferInsert;

@Injectable()
export class AttendancePeriodLockRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async findByPeriod(period: string): Promise<AttendancePeriodLock | null> {
    const row = await this.db
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
  }): Promise<AttendancePeriodLock> {
    const existing = await this.findByPeriod(params.period);

    if (existing) {
      const updateData: Partial<PeriodLockInsert> = {
        status: params.status,
        updatedAt: new Date(),
      };

      // Track who performed the action
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

      const [row] = await this.db
        .update(attendancePeriodLocks)
        .set(updateData)
        .where(eq(attendancePeriodLocks.id, existing.id))
        .returning();
      return this.toDomain(row!);
    }

    // Create new lock record
    const insertData: PeriodLockInsert = {
      period: params.period,
      status: params.status,
      lockedByUserId: params.status === "locked" ? params.userId : null,
      lockedAt: params.status === "locked" ? new Date() : null,
      remarks: params.remarks ?? null,
    };

    const [row] = await this.db
      .insert(attendancePeriodLocks)
      .values(insertData)
      .returning();
    return this.toDomain(row!);
  }

  /**
   * Ensure a period lock record exists (defaults to OPEN).
   * Called when first accessing a period.
   */
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
