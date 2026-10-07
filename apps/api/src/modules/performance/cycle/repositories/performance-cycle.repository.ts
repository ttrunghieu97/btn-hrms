import { Injectable } from "@nestjs/common";
import { count, desc, eq, and, inArray } from "drizzle-orm";
import * as schema from "../../../../infrastructure/database/schema";
import { ScopedDbService } from "../../../../infrastructure/database/scoped-db.service";
import type { PerformanceCycleStatus } from "../../../../infrastructure/database/schema/performance/tables";

export type CycleRow = typeof schema.performanceCycles.$inferSelect;
export type CycleInsert = typeof schema.performanceCycles.$inferInsert;
export type CycleUpdate = Partial<CycleInsert>;

@Injectable()
export class PerformanceCycleRepository {
  private readonly db = this.scopedDb.getDb<typeof schema>();

  constructor(private readonly scopedDb: ScopedDbService) {}

  async insert(values: CycleInsert): Promise<CycleRow> {
    const [row] = await this.db.insert(schema.performanceCycles).values(values).returning();
    return row!;
  }

  async findById(id: string): Promise<CycleRow | null> {
    const row = await this.db.query.performanceCycles.findFirst({
      where: eq(schema.performanceCycles.id, id),
    });
    return row ?? null;
  }

  async findMany(opts?: { status?: PerformanceCycleStatus }): Promise<CycleRow[]> {
    const conditions = [];
    if (opts?.status) conditions.push(eq(schema.performanceCycles.status, opts.status));
    return this.db.query.performanceCycles.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      orderBy: desc(schema.performanceCycles.createdAt),
    });
  }

  async update(id: string, values: CycleUpdate): Promise<CycleRow | null> {
    const [row] = await this.db
      .update(schema.performanceCycles)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(schema.performanceCycles.id, id))
      .returning();
    return row ?? null;
  }

  async existsById(id: string): Promise<boolean> {
    const [result] = await this.db
      .select({ value: count() })
      .from(schema.performanceCycles)
      .where(eq(schema.performanceCycles.id, id));
    return Number(result?.value ?? 0) > 0;
  }
}
