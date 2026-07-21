import { Injectable } from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { sql, and, eq, gte, lte } from "drizzle-orm";
import { ScopedDbService } from "../../../../../infrastructure/database/scoped-db.service";
import * as schema from "../../../../../infrastructure/database/schema";

export interface PendingLeaveByType {
  leaveTypeId: string;
  leaveTypeName: string;
  count: number;
  totalUnits: number;
}

export interface LeaveTrend {
  month: string;
  totalUnits: number;
  leaveTypeName: string;
}

@Injectable()
export class LeaveAggregateService {
  constructor(
    private readonly scopedDb: ScopedDbService,
  ) {}

  private get db(): PostgresJsDatabase<typeof schema> {
    return this.scopedDb.getDb<typeof schema>();
  }

  async getPendingByType(): Promise<PendingLeaveByType[]> {
    return this.db
      .select({
        leaveTypeId: schema.leaveRequests.leaveTypeId,
        leaveTypeName: schema.leaveTypes.name,
        count: sql<number>`count(*)::int`,
        totalUnits:
          sql<number>`coalesce(sum(${schema.leaveRequests.totalUnits}), 0)::int`,
      })
      .from(schema.leaveRequests)
      .innerJoin(
        schema.leaveTypes,
        eq(schema.leaveRequests.leaveTypeId, schema.leaveTypes.id),
      )
      .where(eq(schema.leaveRequests.status, "pending"))
      .groupBy(
        schema.leaveRequests.leaveTypeId,
        schema.leaveTypes.name,
      )
      .orderBy(schema.leaveTypes.name);
  }

  async getTrend(
    from: string,
    to: string,
  ): Promise<LeaveTrend[]> {
    return this.db
      .select({
        month: sql<string>`to_char(${schema.leaveRequests.startDate}, 'YYYY-MM')`,
        totalUnits:
          sql<number>`coalesce(sum(${schema.leaveRequests.totalUnits}), 0)::int`,
        leaveTypeName: schema.leaveTypes.name,
      })
      .from(schema.leaveRequests)
      .innerJoin(
        schema.leaveTypes,
        eq(schema.leaveRequests.leaveTypeId, schema.leaveTypes.id),
      )
      .where(
        and(
          gte(schema.leaveRequests.startDate, from),
          lte(schema.leaveRequests.endDate, to),
          eq(schema.leaveRequests.status, "approved"),
        ),
      )
      .groupBy(
        sql`to_char(${schema.leaveRequests.startDate}, 'YYYY-MM')`,
        schema.leaveTypes.name,
      )
      .orderBy(sql`to_char(${schema.leaveRequests.startDate}, 'YYYY-MM')`);
  }
}
