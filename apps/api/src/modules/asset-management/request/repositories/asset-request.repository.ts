import { Inject, Injectable } from "@nestjs/common";
import { and, count, desc, eq } from "drizzle-orm";
import * as schema from "../../../../infrastructure/database/schema";
import { ScopedDbService } from "../../../../infrastructure/database/scoped-db.service";
import type { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import type { RequestQueryDto } from "../dto/request-query.dto";

export type RequestValues = typeof schema.assetRequests.$inferInsert;
export type RequestRow = typeof schema.assetRequests.$inferSelect;
export type RequestLineValues = typeof schema.assetRequestLines.$inferInsert;
export type RequestLineRow = typeof schema.assetRequestLines.$inferSelect;
export type RequestStatus = NonNullable<RequestValues["status"]>;

export type RequestWithLines = RequestRow & { lines: RequestLineRow[] };

@Injectable()
export class AssetRequestRepository {
  private readonly db = this.scopedDb.getDb<typeof schema>();

  constructor(private readonly scopedDb: ScopedDbService) {}

  transaction<T>(fn: (tx: AppDatabase) => Promise<T>): Promise<T> {
    return this.db.transaction(fn);
  }

  async create(
    values: RequestValues,
    lines: Omit<RequestLineValues, "requestId">[],
    db: AppDatabase = this.db,
  ): Promise<RequestWithLines> {
    const run = async (tx: AppDatabase): Promise<RequestWithLines> => {
      const [request] = await tx
        .insert(schema.assetRequests)
        .values(values)
        .returning();
      const insertedLines = await tx
        .insert(schema.assetRequestLines)
        .values(lines.map((line) => ({ ...line, requestId: request!.id })))
        .returning();
      return { ...request!, lines: insertedLines };
    };

    if (db === this.db) {
      return this.db.transaction(run);
    }
    return run(db);
  }

  async findById(
    id: string,
    db: AppDatabase = this.db,
  ): Promise<RequestWithLines | null> {
    const row = await db.query.assetRequests.findFirst({
      where: eq(schema.assetRequests.id, id),
      with: { lines: true },
    });
    return (row) ?? null;
  }

  async update(
    id: string,
    values: Partial<RequestValues>,
    db: AppDatabase = this.db,
  ) {
    const [row] = await db
      .update(schema.assetRequests)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(schema.assetRequests.id, id))
      .returning();
    return row ?? null;
  }

  async updateStatus(
    id: string,
    values: Partial<RequestValues> & { status: RequestStatus },
    db: AppDatabase = this.db,
  ) {
    return this.update(id, values, db);
  }

  async replaceLines(
    requestId: string,
    lines: Omit<RequestLineValues, "requestId">[],
    db: AppDatabase = this.db,
  ) {
    await db
      .delete(schema.assetRequestLines)
      .where(eq(schema.assetRequestLines.requestId, requestId));
    if (lines.length === 0) return [];
    return db
      .insert(schema.assetRequestLines)
      .values(lines.map((line) => ({ ...line, requestId })))
      .returning();
  }

  /** Mark a request as fulfilled. Lines are informational; the request status
   * is the authoritative signal that items were issued. */
  async markFulfilled(
    id: string,
    fulfilledAt: Date,
    actorUserId: string | null,
    db: AppDatabase = this.db,
  ) {
    return this.update(
      id,
      { status: "fulfilled", fulfilledAt, updatedBy: actorUserId },
      db,
    );
  }

  async list(query: RequestQueryDto) {
    const { page = 1, limit = 20, requesterEmployeeId, status } = query;
    const offset = (page - 1) * limit;
    const conditions = [];

    if (requesterEmployeeId) {
      conditions.push(
        eq(schema.assetRequests.requesterEmployeeId, requesterEmployeeId),
      );
    }
    if (status) {
      conditions.push(eq(schema.assetRequests.status, status));
    }

    const where =
      conditions.length === 0
        ? undefined
        : conditions.length === 1
          ? conditions[0]
          : and(...conditions);

    const rows = await this.db.query.assetRequests.findMany({
      where,
      with: { lines: true },
      orderBy: [desc(schema.assetRequests.createdAt)],
      limit,
      offset,
    });

    const [totalResult] = await this.db
      .select({ value: count() })
      .from(schema.assetRequests)
      .where(where);

    return {
      rows: rows as RequestWithLines[],
      total: Number(totalResult?.value ?? 0),
      page,
      limit,
    };
  }
}
