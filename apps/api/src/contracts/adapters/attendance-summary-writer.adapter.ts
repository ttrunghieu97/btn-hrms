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
    await this.db
      .insert(schema.attendanceDailySummaries)
      .values({
        employeeId,
        workDate,
        status: status as any,
        leaveRequestId,
      })
      .onConflictDoUpdate({
        target: [
          schema.attendanceDailySummaries.employeeId,
          schema.attendanceDailySummaries.workDate,
        ],
        set: {
          status: status as any,
          leaveRequestId,
          updatedAt: new Date(),
        },
      });
  }
}
