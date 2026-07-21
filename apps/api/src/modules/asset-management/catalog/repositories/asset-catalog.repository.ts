import { Inject, Injectable } from "@nestjs/common";
import { and, count, desc, eq, ilike, isNull } from "drizzle-orm";
import * as schema from "../../../../infrastructure/database/schema";
import { ScopedDbService } from "../../../../infrastructure/database/scoped-db.service";
import type { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import type { AssetTypeQueryDto } from "../dto/asset-type-query.dto";
import type { AssetQueryDto } from "../dto/asset-query.dto";

export type AssetTypeValues = typeof schema.assetTypes.$inferInsert;
export type AssetTypeRow = typeof schema.assetTypes.$inferSelect;

export type AssetValues = typeof schema.assets.$inferInsert;
export type AssetRow = typeof schema.assets.$inferSelect;
export type AssetStatus = NonNullable<AssetValues["status"]>;

export type AssetStockLevelValues = typeof schema.assetStockLevels.$inferInsert;

export type AssetHistoryValues = typeof schema.assetHistoryEntries.$inferInsert;
export type AssetHistoryKind = NonNullable<AssetHistoryValues["kind"]>;

@Injectable()
export class AssetCatalogRepository {
  private readonly db = this.scopedDb.getDb<typeof schema>();
  constructor(
    private readonly scopedDb: ScopedDbService,
  ) {}

  transaction<T>(fn: (tx: AppDatabase) => Promise<T>): Promise<T> {
    return this.db.transaction(fn);
  }

  // ─── Asset types ──────────────────────────────────────────────────

  async findTypeById(id: string, db: AppDatabase = this.db) {
    const row = await db.query.assetTypes.findFirst({
      where: eq(schema.assetTypes.id, id),
    });
    return row ?? null;
  }

  async findTypeByCode(code: string, db: AppDatabase = this.db) {
    const row = await db.query.assetTypes.findFirst({
      where: and(
        eq(schema.assetTypes.code, code),
        isNull(schema.assetTypes.deletedAt),
      ),
    });
    return row ?? null;
  }

  async createType(values: AssetTypeValues, db: AppDatabase = this.db) {
    const [row] = await db.insert(schema.assetTypes).values(values).returning();
    return row ?? null;
  }

  async updateType(
    id: string,
    values: Partial<AssetTypeValues>,
    db: AppDatabase = this.db,
  ) {
    const [row] = await db
      .update(schema.assetTypes)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(schema.assetTypes.id, id))
      .returning();
    return row ?? null;
  }

  async listTypes(query: AssetTypeQueryDto) {
    const { page = 1, limit = 20, search, isTrackable } = query;
    const offset = (page - 1) * limit;
    const conditions = [isNull(schema.assetTypes.deletedAt)];

    if (search) {
      conditions.push(ilike(schema.assetTypes.name, `%${search}%`));
    }
    if (isTrackable !== undefined) {
      conditions.push(eq(schema.assetTypes.isTrackable, isTrackable));
    }

    const where = and(...conditions);

    const rows = await this.db.query.assetTypes.findMany({
      where,
      orderBy: [desc(schema.assetTypes.createdAt)],
      limit,
      offset,
    });

    const [totalResult] = await this.db
      .select({ value: count() })
      .from(schema.assetTypes)
      .where(where);

    return {
      rows,
      total: Number(totalResult?.value ?? 0),
      page,
      limit,
    };
  }

  // ─── Stock levels ─────────────────────────────────────────────────

  async createStockLevel(
    values: AssetStockLevelValues,
    db: AppDatabase = this.db,
  ) {
    const [row] = await db
      .insert(schema.assetStockLevels)
      .values(values)
      .returning();
    return row ?? null;
  }

  // ─── Assets ───────────────────────────────────────────────────────

  async findAssetById(id: string, db: AppDatabase = this.db) {
    const row = await db.query.assets.findFirst({
      where: eq(schema.assets.id, id),
    });
    return row ?? null;
  }

  async findAssetByCode(code: string, db: AppDatabase = this.db) {
    const row = await db.query.assets.findFirst({
      where: and(
        eq(schema.assets.code, code),
        isNull(schema.assets.deletedAt),
      ),
    });
    return row ?? null;
  }

  async createAsset(values: AssetValues, db: AppDatabase = this.db) {
    const [row] = await db.insert(schema.assets).values(values).returning();
    return row ?? null;
  }

  async updateAsset(
    id: string,
    values: Partial<AssetValues>,
    db: AppDatabase = this.db,
  ) {
    const [row] = await db
      .update(schema.assets)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(schema.assets.id, id))
      .returning();
    return row ?? null;
  }

  async listAssets(query: AssetQueryDto) {
    const { page = 1, limit = 20, search, assetTypeId, status } = query;
    const offset = (page - 1) * limit;
    const conditions = [isNull(schema.assets.deletedAt)];

    if (assetTypeId) {
      conditions.push(eq(schema.assets.assetTypeId, assetTypeId));
    }
    if (status) {
      conditions.push(eq(schema.assets.status, status));
    }
    if (search) {
      conditions.push(ilike(schema.assets.name, `%${search}%`));
    }

    const where = and(...conditions);

    const rows = await this.db.query.assets.findMany({
      where,
      orderBy: [desc(schema.assets.createdAt)],
      limit,
      offset,
    });

    const [totalResult] = await this.db
      .select({ value: count() })
      .from(schema.assets)
      .where(where);

    return {
      rows,
      total: Number(totalResult?.value ?? 0),
      page,
      limit,
    };
  }

  // ─── History ──────────────────────────────────────────────────────

  async appendHistory(values: AssetHistoryValues, db: AppDatabase = this.db) {
    const [row] = await db
      .insert(schema.assetHistoryEntries)
      .values(values)
      .returning();
    return row ?? null;
  }
}
