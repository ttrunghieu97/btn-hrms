import { Inject, Injectable } from "@nestjs/common";
import { and, eq, gte, lte, inArray } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../../infrastructure/database/database.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../infrastructure/database/schema";
import { ILeaveReaderPort, LeaveRequestInfo } from "../ports/leave-reader.port";

@Injectable()
export class LeaveReaderAdapter implements ILeaveReaderPort {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async findApprovedLeavesByEmployeeIds(
    employeeIds: string[],
    date: string,
  ): Promise<LeaveRequestInfo[]> {
    if (employeeIds.length === 0) return [];
    const rows = await this.db
      .select({
        id: schema.leaveRequests.id,
        employeeId: schema.leaveRequests.employeeId,
        status: schema.leaveRequests.status,
        startDate: schema.leaveRequests.startDate,
        endDate: schema.leaveRequests.endDate,
      })
      .from(schema.leaveRequests)
      .where(
        and(
          eq(schema.leaveRequests.status, "approved"),
          lte(schema.leaveRequests.startDate, date),
          gte(schema.leaveRequests.endDate, date),
          inArray(schema.leaveRequests.employeeId, employeeIds),
        ),
      );
    return rows;
  }
}
