import { Inject, Injectable } from "@nestjs/common";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import * as schema from "../../../../infrastructure/database/schema";
import { ScopedDbService } from "../../../../infrastructure/database/scoped-db.service";
import type { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import type { IssueQueryDto } from "../dto/issue-query.dto";

export type IssueValues = typeof schema.assetIssues.$inferInsert;
export type IssueRow = typeof schema.assetIssues.$inferSelect;
export type IssueLineValues = typeof schema.assetIssueLines.$inferInsert;
export type IssueLineRow = typeof schema.assetIssueLines.$inferSelect;
export type AssetRow = typeof schema.assets.$inferSelect;
export type AssetTypeRow = typeof schema.assetTypes.$inferSelect;
export type StockLevelRow = typeof schema.assetStockLevels.$inferSelect;
export type HistoryEntryValues = typeof schema.assetHistoryEntries.$inferInsert;

export type IssueWithLines = IssueRow & { lines: IssueLineRow[] };

@Injectable()
export class AssetIssueRepository {
  private readonly db = this.scopedDb.getDb<typeof schema>();

  constructor(private readonly scopedDb: ScopedDbService) {}

  transaction<T>(fn: (tx: AppDatabase) => Promise<T>): Promise<T> {
    return this.db.transaction(fn);
  }

  async createIssue(values: IssueValues, db: AppDatabase = this.db) {
    const [row] = await db.insert(schema.assetIssues).values(values).returning();
    return row!;
  }

  async createLine(values: IssueLineValues, db: AppDatabase = this.db) {
    const [row] = await db
      .insert(schema.assetIssueLines)
      .values(values)
      .returning();
    return row!;
  }

  async findById(
    id: string,
    db: AppDatabase = this.db,
  ): Promise<IssueWithLines | null> {
    const row = await db.query.assetIssues.findFirst({
      where: eq(schema.assetIssues.id, id),
      with: { lines: true },
    });
    return (row) ?? null;
  }

  async findLineById(id: string, db: AppDatabase = this.db) {
    const row = await db.query.assetIssueLines.findFirst({
      where: eq(schema.assetIssueLines.id, id),
    });
    return row ?? null;
  }

  async findAsset(id: string, db: AppDatabase = this.db) {
    const row = await db.query.assets.findFirst({
      where: eq(schema.assets.id, id),
    });
    return row ?? null;
  }

  async findAssetType(id: string, db: AppDatabase = this.db) {
    const row = await db.query.assetTypes.findFirst({
      where: eq(schema.assetTypes.id, id),
    });
    return row ?? null;
  }

  async setAssetStatus(
    id: string,
    status: NonNullable<AssetRow["status"]>,
    actorUserId: string | null,
    db: AppDatabase = this.db,
  ) {
    const [row] = await db
      .update(schema.assets)
      .set({ status, updatedBy: actorUserId, updatedAt: new Date() })
      .where(eq(schema.assets.id, id))
      .returning();
    return row ?? null;
  }

  async findStockLevel(assetTypeId: string, db: AppDatabase = this.db) {
    const row = await db.query.assetStockLevels.findFirst({
      where: eq(schema.assetStockLevels.assetTypeId, assetTypeId),
    });
    return row ?? null;
  }

  /** Atomically decrement on-hand stock, guarded so it never goes negative.
   * Returns the updated row, or null if there was insufficient stock. */
  async decrementStock(
    assetTypeId: string,
    quantity: number,
    db: AppDatabase = this.db,
  ) {
    const [row] = await db
      .update(schema.assetStockLevels)
      .set({
        onHand: sql`${schema.assetStockLevels.onHand} - ${quantity}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.assetStockLevels.assetTypeId, assetTypeId),
          sql`${schema.assetStockLevels.onHand} >= ${quantity}`,
        ),
      )
      .returning();
    return row ?? null;
  }

  async incrementStock(
    assetTypeId: string,
    quantity: number,
    db: AppDatabase = this.db,
  ) {
    const [row] = await db
      .update(schema.assetStockLevels)
      .set({
        onHand: sql`${schema.assetStockLevels.onHand} + ${quantity}`,
        updatedAt: new Date(),
      })
      .where(eq(schema.assetStockLevels.assetTypeId, assetTypeId))
      .returning();
    return row ?? null;
  }

  async closeLine(
    id: string,
    values: {
      status?: NonNullable<IssueLineRow["status"]>;
      quantity?: number;
      returnedAt?: Date;
      returnedToUserId?: string | null;
      condition?: string | null;
    },
    db: AppDatabase = this.db,
  ) {
    const [row] = await db
      .update(schema.assetIssueLines)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(schema.assetIssueLines.id, id))
      .returning();
    return row ?? null;
  }

  async appendHistory(entry: HistoryEntryValues, db: AppDatabase = this.db) {
    const [row] = await db
      .insert(schema.assetHistoryEntries)
      .values(entry)
      .returning();
    return row!;
  }

  /** Open holdings for an employee, derived from open issue lines. */
  async findOpenLinesByEmployee(employeeId: string, db: AppDatabase = this.db) {
    return db
      .select({
        issueLineId: schema.assetIssueLines.id,
        issueId: schema.assetIssueLines.issueId,
        assetId: schema.assetIssueLines.assetId,
        assetTypeId: schema.assetIssueLines.assetTypeId,
        quantity: schema.assetIssueLines.quantity,
        status: schema.assetIssueLines.status,
        issuedAt: schema.assetIssues.issuedAt,
      })
      .from(schema.assetIssueLines)
      .innerJoin(
        schema.assetIssues,
        eq(schema.assetIssueLines.issueId, schema.assetIssues.id),
      )
      .where(
        and(
          eq(schema.assetIssues.employeeId, employeeId),
          eq(schema.assetIssueLines.status, "open"),
        ),
      )
      .orderBy(desc(schema.assetIssues.issuedAt));
  }

  /**
   * Rich open-holdings projection for one or more employees, joined with asset
   * and asset-type so consumers get the entity-free {@link AssetHoldingDto}
   * shape without touching asset repositories. Serialized assets contribute
   * their code/serial; quantity lines carry only the type name.
   */
  async findHoldingsByEmployeeIds(
    employeeIds: string[],
    db: AppDatabase = this.db,
  ) {
    if (employeeIds.length === 0) return [];
    return db
      .select({
        employeeId: schema.assetIssues.employeeId,
        assetId: schema.assetIssueLines.assetId,
        assetTag: schema.assets.code,
        assetTypeName: schema.assetTypes.name,
        serialNumber: schema.assets.serialNumber,
        quantity: schema.assetIssueLines.quantity,
        issuedAt: schema.assetIssues.issuedAt,
        status: schema.assetIssueLines.status,
      })
      .from(schema.assetIssueLines)
      .innerJoin(
        schema.assetIssues,
        eq(schema.assetIssueLines.issueId, schema.assetIssues.id),
      )
      .innerJoin(
        schema.assetTypes,
        eq(schema.assetIssueLines.assetTypeId, schema.assetTypes.id),
      )
      .leftJoin(
        schema.assets,
        eq(schema.assetIssueLines.assetId, schema.assets.id),
      )
      .where(
        and(
          inArray(schema.assetIssues.employeeId, employeeIds),
          eq(schema.assetIssueLines.status, "open"),
        ),
      )
      .orderBy(desc(schema.assetIssues.issuedAt));
  }

  async list(query: IssueQueryDto) {
    const { page = 1, limit = 20, employeeId, requestId } = query;
    const offset = (page - 1) * limit;
    const conditions = [];

    if (employeeId) {
      conditions.push(eq(schema.assetIssues.employeeId, employeeId));
    }
    if (requestId) {
      conditions.push(eq(schema.assetIssues.requestId, requestId));
    }

    const where =
      conditions.length === 0
        ? undefined
        : conditions.length === 1
          ? conditions[0]
          : and(...conditions);

    const rows = await this.db.query.assetIssues.findMany({
      where,
      with: { lines: true },
      orderBy: [desc(schema.assetIssues.issuedAt)],
      limit,
      offset,
    });

    const [totalResult] = await this.db
      .select({ value: count() })
      .from(schema.assetIssues)
      .where(where);

    return {
      rows: rows as IssueWithLines[],
      total: Number(totalResult?.value ?? 0),
      page,
      limit,
    };
  }
}
