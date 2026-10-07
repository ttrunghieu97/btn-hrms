import { Inject, Injectable } from "@nestjs/common";
import { asc, eq } from "drizzle-orm";
import * as schema from "../../../../infrastructure/database/schema";
import { ScopedDbService } from "../../../../infrastructure/database/scoped-db.service";
import type { AppDatabase } from "../../../../infrastructure/database/database-client.type";

export type HistoryEntryValues =
  typeof schema.assetHistoryEntries.$inferInsert;
export type HistoryEntryRow = typeof schema.assetHistoryEntries.$inferSelect;

@Injectable()
export class AssetHistoryRepository {
  private readonly db = this.scopedDb.getDb<typeof schema>();

  constructor(private readonly scopedDb: ScopedDbService) {}

  transaction<T>(fn: (tx: AppDatabase) => Promise<T>): Promise<T> {
    return this.db.transaction(fn);
  }

  /** Append a single history entry. The ledger is append-only; entries are
   * never mutated or deleted. */
  async append(entry: HistoryEntryValues, db: AppDatabase = this.db) {
    const [row] = await db
      .insert(schema.assetHistoryEntries)
      .values(entry)
      .returning();
    return row!;
  }

  /** Chronological (oldest-first) history for a single asset, so callers can
   * reconstruct its custody timeline. */
  async listByAsset(assetId: string, db: AppDatabase = this.db) {
    return db.query.assetHistoryEntries.findMany({
      where: eq(schema.assetHistoryEntries.assetId, assetId),
      orderBy: [asc(schema.assetHistoryEntries.occurredAt)],
    });
  }
}
