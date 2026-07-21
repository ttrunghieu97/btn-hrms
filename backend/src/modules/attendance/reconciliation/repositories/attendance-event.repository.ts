import { Injectable } from "@nestjs/common";
import { and, count, eq, gte, inArray, lte } from "drizzle-orm";
import * as schema from "../../../../infrastructure/database/schema";
import { attendanceEvents } from "../../../../infrastructure/database/schema";
import { ScopedDbService } from "../../../../infrastructure/database/scoped-db.service";

export interface AttendanceEventRow {
  id: string;
  employeeId: string;
  type: "CLOCK_IN" | "CLOCK_OUT";
  timestamp: Date;
  source: "DEVICE" | "MANUAL";
  locationId: string | null;
}

@Injectable()
export class AttendanceEventRepository {
  private readonly db = this.scopedDb.getDb<typeof schema>();

  constructor(private readonly scopedDb: ScopedDbService) {}

  async insert(
    data: Pick<
      typeof attendanceEvents.$inferInsert,
      "employeeId" | "type" | "timestamp" | "source" | "locationId" | "idempotencyKey"
    >,
  ): Promise<AttendanceEventRow> {
    const [row] = await this.db
      .insert(attendanceEvents)
      .values(data)
      .returning();
    return row!;
  }

  async findByEmployeeAndRange(
    employeeId: string,
    from: Date,
    to: Date,
  ): Promise<AttendanceEventRow[]> {
    return this.db
      .select()
      .from(attendanceEvents)
      .where(
        and(
          eq(attendanceEvents.employeeId, employeeId),
          gte(attendanceEvents.timestamp, from),
          lte(attendanceEvents.timestamp, to),
        ),
      )
      .orderBy(attendanceEvents.timestamp);
  }

  async findByEmployeeIdsAndRange(
    employeeIds: string[],
    from: Date,
    to: Date,
  ): Promise<AttendanceEventRow[]> {
    if (!employeeIds.length) return [];
    return this.db
      .select()
      .from(attendanceEvents)
      .where(
        and(
          inArray(attendanceEvents.employeeId, employeeIds),
          gte(attendanceEvents.timestamp, from),
          lte(attendanceEvents.timestamp, to),
        ),
      )
      .orderBy(attendanceEvents.timestamp);
  }

  async countByDate(date: string): Promise<number> {
    const [result] = await this.db
      .select({ value: count() })
      .from(attendanceEvents)
      .where(
        and(
          gte(attendanceEvents.timestamp, new Date(`${date}T00:00:00Z`)),
          lte(attendanceEvents.timestamp, new Date(`${date}T23:59:59Z`)),
        ),
      );
    return Number(result?.value ?? 0);
  }
}
