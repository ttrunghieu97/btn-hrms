import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE_CONNECTION } from "../../infrastructure/database/database.provider";
import * as schema from "../../infrastructure/database/schema";
import {
  ReconciliationAttendanceReaderPort,
  AttendanceSessionRow,
  ClockEventRow,
} from "../ports/reconciliation-attendance-reader.port";

@Injectable()
export class ReconciliationAttendanceReaderAdapter
  implements ReconciliationAttendanceReaderPort
{
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async findSessionsByEmployeeAndDate(
    employeeId: string,
    date: string,
  ): Promise<AttendanceSessionRow[]> {
    return this.db.query.attendanceSessions.findMany({
      where: and(
        eq(schema.attendanceSessions.employeeId, employeeId),
        eq(schema.attendanceSessions.date, date),
      ),
    });
  }

  async findClockEventsByEmployeeAndDate(
    employeeId: string,
    date: string,
  ): Promise<ClockEventRow[]> {
    return this.db.query.attendances.findMany({
      where: and(
        eq(schema.attendances.employeeId, employeeId),
        eq(schema.attendances.date, date),
      ),
    });
  }
}
