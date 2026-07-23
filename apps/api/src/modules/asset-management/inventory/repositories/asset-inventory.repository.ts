import { Inject, Injectable } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import * as schema from "../../../../infrastructure/database/schema";
import { ScopedDbService } from "../../../../infrastructure/database/scoped-db.service";
import type { AppDatabase } from "../../../../infrastructure/database/database-client.type";

export type AssetStockLevelRow = typeof schema.assetStockLevels.$inferSelect;
export type AssetStockLevelValues = typeof schema.assetStockLevels.$inferInsert;

export type AssetHistoryValues = typeof schema.assetHistoryEntries.$inferInsert;
export type AssetHistoryKind = NonNullable<AssetHistoryValues["kind"]>;

@Injectable()
export class AssetInventoryRepository {
  private readonly db = this.scopedDb.getDb<typeof schema>();
  constructor(
    private readonly scopedDb: ScopedDbService,
  ) {}

  transaction<T>(fn: (tx: AppDatabase) => Promise<T>): Promise<T> {
    return this.db.transaction(fn);
  }

  async findTypeById(id: string, db: AppDatabase = this.db) {
    const row = await db.query.assetTypes.findFirst({
      where: eq(schema.assetTypes.id, id),
    });
    return row ?? null;
  }

  async getStockByType(assetTypeId: string, db: AppDatabase = this.db) {
    const row = await db.query.assetStockLevels.findFirst({
      where: eq(schema.assetStockLevels.assetTypeId, assetTypeId),
    });
    return row ?? null;
  }

  async listStock() {
    return this.db.query.assetStockLevels.findMany({
      orderBy: [schema.assetStockLevels.assetTypeId],
    });
  }

  /**
   * Applies a signed delta to on-hand within the given (transactional) db and
   * returns the updated row. The DB check constraint guards against negatives
   * as a backstop; callers must still validate before calling.
   */
  async adjustOnHand(
    assetTypeId: string,
    delta: number,
    db: AppDatabase = this.db,
  ) {
    const [row] = await db
      .update(schema.assetStockLevels)
      .set({
        onHand: sql`${schema.assetStockLevels.onHand} + ${delta}`,
        updatedAt: new Date(),
      })
      .where(eq(schema.assetStockLevels.assetTypeId, assetTypeId))
      .returning();
    return row ?? null;
  }

  async appendHistory(values: AssetHistoryValues, db: AppDatabase = this.db) {
    const [row] = await db
      .insert(schema.assetHistoryEntries)
      .values(values)
      .returning();
    return row ?? null;
  }

  /**
   * Reconciliation query: the stock on-hand implied by the append-only history
   * log for a type, computed as SUM(quantityDelta). Used to verify the stock
   * projection has not drifted from its source of truth.
   */
  async recomputeFromHistory(assetTypeId: string, db: AppDatabase = this.db) {
    const [result] = await db
      .select({
        total: sql<number>`coalesce(sum(${schema.assetHistoryEntries.quantityDelta}), 0)`,
      })
      .from(schema.assetHistoryEntries)
      .where(eq(schema.assetHistoryEntries.assetTypeId, assetTypeId));
    return Number(result?.total ?? 0);
  }
}
