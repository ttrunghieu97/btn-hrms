import {  Inject , Injectable } from "@nestjs/common";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import * as schema from "../../../../infrastructure/database/schema";
import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  lte,
  or,
  type SQL,
} from "drizzle-orm";
import { BaseRepository } from "../../../../infrastructure/repositories/base.repository";

@Injectable()
export class AuditLogsRepository extends BaseRepository<
  typeof schema.auditLogs.$inferSelect,
  typeof schema.auditLogs.$inferInsert,
  Partial<typeof schema.auditLogs.$inferInsert>
> {

  constructor(@Inject(DATABASE_CONNECTION) private readonly db: AppDatabase) {
    super();
    this.db = this.db;
  }

  async create(values: typeof schema.auditLogs.$inferInsert): Promise<typeof schema.auditLogs.$inferSelect | null> {
    const [row] = await this.db
      .insert(schema.auditLogs)
      .values(values)
      .returning();
    return row ?? null;
  }

  async findById(id: string) {
    const row = await this.db.query.auditLogs.findFirst({
      where: eq(schema.auditLogs.id, id),
      with: { actor: true },
    });
    return row ?? null;
  }

  findMany({
    limit,
    offset,
    where,
  }: {
    limit: number;
    offset: number;
    where?: SQL;
  }) {
    return this.db.query.auditLogs.findMany({
      where,
      orderBy: [desc(schema.auditLogs.createdAt)],
      limit,
      offset,
      with: {
        actor: true,
      },
    });
  }

  async update(
    id: string,
    data: Partial<typeof schema.auditLogs.$inferInsert>,
  ) {
    const [row] = await this.db
      .update(schema.auditLogs)
      .set(data)
      .where(eq(schema.auditLogs.id, id))
      .returning();
    return row ?? null;
  }

  async delete(id: string) {
    await this.db
      .delete(schema.auditLogs)
      .where(eq(schema.auditLogs.id, id));
  }

  async countAll(where?: SQL) {
    const query = this.db.select({ value: count() }).from(schema.auditLogs);
    const [row] = await query.where(where);
    return Number(row?.value ?? 0);
  }

  buildWhere(filters: {
    actorUserId?: string;
    action?: string;
    entity?: string;
    entityId?: string;
    result?: 'SUCCESS' | 'FAILED';
    traceId?: string;
    from?: Date;
    to?: Date;
    search?: string;
  }) {
    const clauses: (SQL | undefined)[] = [];

    if (filters.actorUserId) {
      clauses.push(eq(schema.auditLogs.actorUserId, filters.actorUserId));
    }
    if (filters.action) {
      clauses.push(eq(schema.auditLogs.action, filters.action));
    }
    if (filters.entity) {
      clauses.push(eq(schema.auditLogs.entity, filters.entity));
    }
    if (filters.entityId) {
      clauses.push(eq(schema.auditLogs.entityId, filters.entityId));
    }
    if (filters.result) {
      clauses.push(eq(schema.auditLogs.result, filters.result));
    }
    if (filters.traceId) {
      clauses.push(eq(schema.auditLogs.traceId, filters.traceId));
    }
    if (filters.from) {
      clauses.push(gte(schema.auditLogs.createdAt, filters.from));
    }
    if (filters.to) {
      clauses.push(lte(schema.auditLogs.createdAt, filters.to));
    }
    if (filters.search) {
      const q = `%${filters.search}%`;
      clauses.push(
        or(
          ilike(schema.auditLogs.action, q),
          ilike(schema.auditLogs.entity, q),
        ),
      );
    }

    if (!clauses.length) return undefined;
    return and(...clauses);
  }
}



