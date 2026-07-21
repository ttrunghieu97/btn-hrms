import { Injectable } from "@nestjs/common";
import { count, eq, and } from "drizzle-orm";
import * as schema from "../../../../infrastructure/database/schema";
import { ScopedDbService } from "../../../../infrastructure/database/scoped-db.service";

export type PerformanceResultRow = typeof schema.performanceResults.$inferSelect;
export type PerformanceResultInsert = typeof schema.performanceResults.$inferInsert;
export type PerformanceResultUpdate = Partial<PerformanceResultInsert>;

@Injectable()
export class PerformanceResultRepository {
  private readonly db = this.scopedDb.getDb<typeof schema>();

  constructor(private readonly scopedDb: ScopedDbService) {}

  async upsert(values: PerformanceResultInsert): Promise<PerformanceResultRow> {
    const existing = await this.findByCycleAndEmployee(values.cycleId, values.employeeId);
    if (existing) {
      const [row] = await this.db
        .update(schema.performanceResults)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(schema.performanceResults.id, existing.id))
        .returning();
      return row!;
    }
    const [row] = await this.db.insert(schema.performanceResults).values(values).returning();
    return row!;
  }

  async findByCycleAndEmployee(
    cycleId: string,
    employeeId: string,
  ): Promise<PerformanceResultRow | null> {
    const row = await this.db.query.performanceResults.findFirst({
      where: and(
        eq(schema.performanceResults.cycleId, cycleId),
        eq(schema.performanceResults.employeeId, employeeId),
      ),
    });
    return row ?? null;
  }

  async findManyByCycle(cycleId: string): Promise<PerformanceResultRow[]> {
    return this.db.query.performanceResults.findMany({
      where: eq(schema.performanceResults.cycleId, cycleId),
    });
  }

  async countPublished(cycleId: string): Promise<number> {
    const [result] = await this.db
      .select({ value: count() })
      .from(schema.performanceResults)
      .where(
        and(
          eq(schema.performanceResults.cycleId, cycleId),
          // publishedAt is set → published
        ),
      );
    return Number(result?.value ?? 0);
  }
}
