import { Injectable, Inject } from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import * as schema from "../../../../infrastructure/database/schema";
import type {
  DailyScheduleRecord,
  ScheduleRequirementRecord,
  RequirementInput,
  IScheduleRepository,
} from "./schedule.repository.contract";

@Injectable()
export class ScheduleRepository implements IScheduleRepository {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: AppDatabase) {}

  async ensureSchedule(date: string): Promise<DailyScheduleRecord> {
    const existing = await this.getSchedule(date);
    if (existing) return existing;

    const [row] = await this.db.insert(schema.dailySchedules).values({ date }).returning();
    return row!;
  }

  async getSchedule(date: string): Promise<DailyScheduleRecord | null> {
    const row = await this.db.query.dailySchedules.findFirst({
      where: eq(schema.dailySchedules.date, date),
    });
    return row ?? null;
  }

  async getScheduleById(id: string): Promise<DailyScheduleRecord | null> {
    const row = await this.db.query.dailySchedules.findFirst({
      where: eq(schema.dailySchedules.id, id),
    });
    return row ?? null;
  }

  async updateStatus(id: string, status: string, userId?: string): Promise<DailyScheduleRecord | null> {
    const now = new Date();
    const updates: Record<string, any> = { status, updatedAt: now };
    if (status === "published") {
      updates.publishedAt = now;
      updates.publishedBy = userId ?? null;
    } else if (status === "locked") {
      updates.lockedAt = now;
      updates.lockedBy = userId ?? null;
    }

    const [row] = await this.db
      .update(schema.dailySchedules)
      .set(updates)
      .where(eq(schema.dailySchedules.id, id))
      .returning();
    return row ?? null;
  }

  async getRequirements(scheduleId: string): Promise<ScheduleRequirementRecord[]> {
    return this.db.query.scheduleRequirements.findMany({
      where: eq(schema.scheduleRequirements.scheduleId, scheduleId),
      with: {
        location: { columns: { id: true, name: true } },
        workRole: { columns: { id: true, name: true } },
        shiftTemplate: { columns: { id: true, name: true, startTime: true, endTime: true } },
      },
    });
  }

  async replaceRequirements(
    scheduleId: string,
    requirements: RequirementInput[]
  ): Promise<ScheduleRequirementRecord[]> {
    return this.db.transaction(async (tx) => {
      await tx
        .delete(schema.scheduleRequirements)
        .where(eq(schema.scheduleRequirements.scheduleId, scheduleId));

      if (requirements.length > 0) {
        await tx.insert(schema.scheduleRequirements).values(
          requirements.map((r) => ({
            scheduleId,
            locationId: r.locationId ?? null,
            workRoleId: r.workRoleId ?? null,
            shiftTemplateId: r.shiftTemplateId ?? null,
            requiredCount: r.requiredCount,
          }))
        );
      }

      return tx.query.scheduleRequirements.findMany({
        where: eq(schema.scheduleRequirements.scheduleId, scheduleId),
        with: {
          location: { columns: { id: true, name: true } },
          workRole: { columns: { id: true, name: true } },
          shiftTemplate: { columns: { id: true, name: true, startTime: true, endTime: true } },
        },
      });
    });
  }

  async upsertRequirements(
    scheduleId: string,
    upserts: RequirementInput[],
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      for (const u of upserts) {
        if (u.requiredCount < 1) {
          await tx.delete(schema.scheduleRequirements).where(
            and(
              eq(schema.scheduleRequirements.scheduleId, scheduleId),
              u.locationId ? eq(schema.scheduleRequirements.locationId, u.locationId) : sql`1=1`,
              u.workRoleId ? eq(schema.scheduleRequirements.workRoleId, u.workRoleId) : sql`1=1`,
              u.shiftTemplateId ? eq(schema.scheduleRequirements.shiftTemplateId, u.shiftTemplateId) : sql`1=1`,
            )
          );
          continue;
        }

        await tx
          .insert(schema.scheduleRequirements)
          .values({
            scheduleId,
            locationId: u.locationId ?? null,
            workRoleId: u.workRoleId ?? null,
            shiftTemplateId: u.shiftTemplateId ?? null,
            requiredCount: u.requiredCount,
          })
          .onConflictDoUpdate({
            target: [
              schema.scheduleRequirements.scheduleId,
              schema.scheduleRequirements.locationId,
              schema.scheduleRequirements.workRoleId,
              schema.scheduleRequirements.shiftTemplateId,
            ],
            set: { requiredCount: u.requiredCount },
          });
      }
    });
  }
}
