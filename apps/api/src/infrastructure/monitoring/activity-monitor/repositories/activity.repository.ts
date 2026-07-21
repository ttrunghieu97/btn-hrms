import { Inject, Injectable } from "@nestjs/common";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import type { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import { auditLogs, users } from "../../../../infrastructure/database/schema";
import { eq, desc, and, gte, lte, count } from "drizzle-orm";
import { safeLimit, safePage } from "../../../../shared/dto/pagination.dto";
import type { ActivityQueryDto } from "../dto/activity-query.dto";

export interface ActivityRow {
  id: string;
  actorUserId: string | null;
  actorName: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface PaginatedResult<T> {
  rows: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class ActivityRepository {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: AppDatabase) {}

  async findMany(query: ActivityQueryDto): Promise<PaginatedResult<ActivityRow>> {
    const page = safePage(query.page);
    const limit = safeLimit(query.limit);
    const offset = (page - 1) * limit;

    const conditions = this.buildWhere(query);

    const countResult = await this.db
      .select({ total: count() })
      .from(auditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    const total = Number(countResult[0]?.total ?? 0);

    const rows = await this.db
      .select({
        id: auditLogs.id,
        actorUserId: auditLogs.actorUserId,
        actorName: users.username,
        action: auditLogs.action,
        entity: auditLogs.entity,
        entityId: auditLogs.entityId,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.actorUserId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return { rows: rows as ActivityRow[], total: Number(total), page, limit };
  }

  private buildWhere(query: ActivityQueryDto) {
    const conditions: ReturnType<typeof eq>[] = [];

    if (query.action) {
      conditions.push(eq(auditLogs.action, query.action));
    }
    if (query.entity) {
      conditions.push(eq(auditLogs.entity, query.entity));
    }
    if (query.actorUserId) {
      conditions.push(eq(auditLogs.actorUserId, query.actorUserId));
    }
    if (query.from) {
      conditions.push(gte(auditLogs.createdAt, new Date(query.from)));
    }
    if (query.to) {
      conditions.push(lte(auditLogs.createdAt, new Date(query.to)));
    }

    return conditions;
  }

  async findDistinctActions(): Promise<string[]> {
    const rows = await this.db
      .select({ action: auditLogs.action })
      .from(auditLogs)
      .groupBy(auditLogs.action)
      .orderBy(auditLogs.action)
      .limit(100);

    return rows.map((r: { action: string }) => r.action);
  }

  async findDistinctEntities(): Promise<string[]> {
    const rows = await this.db
      .select({ entity: auditLogs.entity })
      .from(auditLogs)
      .groupBy(auditLogs.entity)
      .orderBy(auditLogs.entity)
      .limit(50);

    return rows.map((r: { entity: string }) => r.entity);
  }
}
