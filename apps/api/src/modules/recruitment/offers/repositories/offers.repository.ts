import { Inject, Injectable } from "@nestjs/common";
import { desc, eq } from "drizzle-orm";
import * as schema from "../../../../infrastructure/database/schema";
import { ScopedDbService } from "../../../../infrastructure/database/scoped-db.service";
import type { AppDatabase } from "../../../../infrastructure/database/database-client.type";

export type OfferValues = typeof schema.offers.$inferInsert;
export type OfferRow = typeof schema.offers.$inferSelect;
export type OfferStatus = NonNullable<OfferValues["status"]>;

@Injectable()
export class OffersRepository {
  private readonly db = this.scopedDb.getDb<typeof schema>();
  constructor(
    private readonly scopedDb: ScopedDbService,
  ) {}

  transaction<T>(fn: (tx: AppDatabase) => Promise<T>): Promise<T> {
    return this.db.transaction(fn);
  }

  async findById(id: string, db: AppDatabase = this.db) {
    const row = await db.query.offers.findFirst({
      where: eq(schema.offers.id, id),
    });
    return row ?? null;
  }

  async create(values: OfferValues, db: AppDatabase = this.db) {
    const [row] = await db.insert(schema.offers).values(values).returning();
    return row ?? null;
  }

  async updateStatus(
    id: string,
    status: OfferStatus,
    db: AppDatabase = this.db,
    decidedAt?: Date,
  ) {
    const [row] = await db
      .update(schema.offers)
      .set({
        status,
        updatedAt: new Date(),
        ...(decidedAt ? { decidedAt } : {}),
      })
      .where(eq(schema.offers.id, id))
      .returning();
    return row ?? null;
  }

  async listByApplication(applicationId: string, db: AppDatabase = this.db) {
    return db.query.offers.findMany({
      where: eq(schema.offers.applicationId, applicationId),
      orderBy: [desc(schema.offers.createdAt)],
    });
  }
}
