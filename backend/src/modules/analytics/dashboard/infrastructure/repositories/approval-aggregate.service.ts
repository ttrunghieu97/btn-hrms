import { Injectable } from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { sql, eq, and } from "drizzle-orm";
import { ScopedDbService } from "../../../../../infrastructure/database/scoped-db.service";
import * as schema from "../../../../../infrastructure/database/schema";

export interface PendingApprovalGroup {
  subjectType: string;
  count: number;
}

export interface PendingApprovalsResult {
  total: number;
  items: PendingApprovalGroup[];
}

@Injectable()
export class ApprovalAggregateService {
  constructor(
    private readonly scopedDb: ScopedDbService,
  ) {}

  private get db(): PostgresJsDatabase<typeof schema> {
    return this.scopedDb.getDb<typeof schema>();
  }

  async getPendingForUser(userId: string): Promise<PendingApprovalsResult> {
    const rows = await this.db
      .select({
        subjectType: schema.approvalRequests.subjectType,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.approvalSteps)
      .innerJoin(
        schema.approvalRequests,
        eq(schema.approvalSteps.requestId, schema.approvalRequests.id),
      )
      .where(
        and(
          eq(schema.approvalSteps.approverUserId, userId),
          eq(schema.approvalSteps.status, "pending"),
          eq(schema.approvalRequests.status, "pending"),
        ),
      )
      .groupBy(schema.approvalRequests.subjectType)
      .orderBy(schema.approvalRequests.subjectType);

    const total = rows.reduce((sum, r) => sum + r.count, 0);

    return {
      total,
      items: rows.map((r) => ({
        subjectType: r.subjectType,
        count: r.count,
      })),
    };
  }
}
