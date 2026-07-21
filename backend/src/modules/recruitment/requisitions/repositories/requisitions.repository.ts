import { Inject, Injectable } from "@nestjs/common";
import { and, count, desc, eq, ilike } from "drizzle-orm";
import * as schema from "../../../../infrastructure/database/schema";
import { ScopedDbService } from "../../../../infrastructure/database/scoped-db.service";
import type { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import type { RequisitionQueryDto } from "../dto/requisition-query.dto";

export type RequisitionValues = typeof schema.jobRequisitions.$inferInsert;
export type RequisitionRow = typeof schema.jobRequisitions.$inferSelect;
export type RequisitionStatus =
  NonNullable<RequisitionValues["status"]>;

@Injectable()
export class RequisitionsRepository {
  private readonly db = this.scopedDb.getDb<typeof schema>();
  constructor(
    private readonly scopedDb: ScopedDbService,
  ) {}

  transaction<T>(fn: (tx: AppDatabase) => Promise<T>): Promise<T> {
    return this.db.transaction(fn);
  }

  async findById(id: string, db: AppDatabase = this.db) {
    const row = await db.query.jobRequisitions.findFirst({
      where: eq(schema.jobRequisitions.id, id),
    });
    return row ?? null;
  }

  async create(values: RequisitionValues, db: AppDatabase = this.db) {
    const [row] = await db
      .insert(schema.jobRequisitions)
      .values(values)
      .returning();
    return row ?? null;
  }

  async update(
    id: string,
    values: Partial<RequisitionValues>,
    db: AppDatabase = this.db,
  ) {
    const [row] = await db
      .update(schema.jobRequisitions)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(schema.jobRequisitions.id, id))
      .returning();
    return row ?? null;
  }

  async updateStatus(
    id: string,
    status: RequisitionStatus,
    db: AppDatabase = this.db,
  ) {
    return this.update(id, { status }, db);
  }

  async list(query: RequisitionQueryDto) {
    const { page = 1, limit = 20, departmentId, status, search } = query;
    const offset = (page - 1) * limit;
    const conditions = [];

    if (departmentId) {
      conditions.push(eq(schema.jobRequisitions.departmentId, departmentId));
    }
    if (status) {
      conditions.push(eq(schema.jobRequisitions.status, status));
    }
    if (search) {
      conditions.push(ilike(schema.jobRequisitions.title, `%${search}%`));
    }

    const where =
      conditions.length === 0
        ? undefined
        : conditions.length === 1
          ? conditions[0]
          : and(...conditions);

    const rows = await this.db.query.jobRequisitions.findMany({
      where,
      orderBy: [desc(schema.jobRequisitions.createdAt)],
      limit,
      offset,
    });

    const [totalResult] = await this.db
      .select({ value: count() })
      .from(schema.jobRequisitions)
      .where(where);

    return {
      rows,
      total: Number(totalResult?.value ?? 0),
      page,
      limit,
    };
  }
}
