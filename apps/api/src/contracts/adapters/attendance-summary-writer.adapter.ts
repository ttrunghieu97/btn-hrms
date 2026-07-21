import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../../infrastructure/database/database.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../infrastructure/database/schema";
import { IAttendanceSummaryWriterPort } from "../ports/attendance-summary-writer.port";

@Injectable()
export class AttendanceSummaryWriterAdapter implements IAttendanceSummaryWriterPort {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async upsertFromLeave(
    employeeId: string,
    workDate: string,
    status: string,
    leaveRequestId: string | null,
  ): Promise<void> {
    const existing = await this.db.query.attendanceDailySummaries.findFirst({
      where: and(
        eq(schema.attendanceDailySummaries.employeeId, employeeId),
        eq(schema.attendanceDailySummaries.workDate, workDate),
      ),
    });

    if (existing) {
      await this.db
        .update(schema.attendanceDailySummaries)
        .set({
          status: status as any,
          leaveRequestId,
          updatedAt: new Date(),
        })
        .where(eq(schema.attendanceDailySummaries.id, existing.id));
    } else {
      await this.db
        .insert(schema.attendanceDailySummaries)
        .values({
          employeeId,
          workDate,
          status: status as any,
          leaveRequestId,
        });
    }
  }
}
