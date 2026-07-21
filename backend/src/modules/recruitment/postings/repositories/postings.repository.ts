import { Inject, Injectable } from "@nestjs/common";
import { and, count, desc, eq, ilike } from "drizzle-orm";
import * as schema from "../../../../infrastructure/database/schema";
import { ScopedDbService } from "../../../../infrastructure/database/scoped-db.service";
import type { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import type { PostingQueryDto } from "../dto/posting-query.dto";

export type PostingValues = typeof schema.jobPostings.$inferInsert;
export type PostingRow = typeof schema.jobPostings.$inferSelect;
export type PostingStatus = NonNullable<PostingValues["status"]>;

@Injectable()
export class PostingsRepository {
  private readonly db = this.scopedDb.getDb<typeof schema>();
  constructor(
    private readonly scopedDb: ScopedDbService,
  ) {}

  transaction<T>(fn: (tx: AppDatabase) => Promise<T>): Promise<T> {
    return this.db.transaction(fn);
  }

  async findById(id: string, db: AppDatabase = this.db) {
    const row = await db.query.jobPostings.findFirst({
      where: eq(schema.jobPostings.id, id),
    });
    return row ?? null;
  }

  async findRequisitionById(id: string, db: AppDatabase = this.db) {
    const row = await db.query.jobRequisitions.findFirst({
      where: eq(schema.jobRequisitions.id, id),
    });
    return row ?? null;
  }

  async create(values: PostingValues, db: AppDatabase = this.db) {
    const [row] = await db
      .insert(schema.jobPostings)
      .values(values)
      .returning();
    return row ?? null;
  }

  async update(
    id: string,
    values: Partial<PostingValues>,
    db: AppDatabase = this.db,
  ) {
    const [row] = await db
      .update(schema.jobPostings)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(schema.jobPostings.id, id))
      .returning();
    return row ?? null;
  }

  async updateStatus(
    id: string,
    status: PostingStatus,
    db: AppDatabase = this.db,
  ) {
    return this.update(id, { status }, db);
  }

  async list(query: PostingQueryDto) {
    const { page = 1, limit = 20, requisitionId, status, search } = query;
    const offset = (page - 1) * limit;
    const conditions = [];

    if (requisitionId) {
      conditions.push(eq(schema.jobPostings.requisitionId, requisitionId));
    }
    if (status) {
      conditions.push(eq(schema.jobPostings.status, status));
    }
    if (search) {
      conditions.push(ilike(schema.jobPostings.title, `%${search}%`));
    }

    const where =
      conditions.length === 0
        ? undefined
        : conditions.length === 1
          ? conditions[0]
          : and(...conditions);

    const rows = await this.db.query.jobPostings.findMany({
      where,
      orderBy: [desc(schema.jobPostings.createdAt)],
      limit,
      offset,
    });

    const [totalResult] = await this.db
      .select({ value: count() })
      .from(schema.jobPostings)
      .where(where);

    return {
      rows,
      total: Number(totalResult?.value ?? 0),
      page,
      limit,
    };
  }
}
