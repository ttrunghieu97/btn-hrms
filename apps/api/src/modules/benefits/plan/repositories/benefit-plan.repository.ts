import { Injectable } from "@nestjs/common";
import { eq, desc, count } from "drizzle-orm";
import * as schema from "../../../../infrastructure/database/schema";
import { ScopedDbService } from "../../../../infrastructure/database/scoped-db.service";

export type PlanRow = typeof schema.benefitPlans.$inferSelect;
export type PlanInsert = typeof schema.benefitPlans.$inferInsert;
export type PlanUpdate = Partial<PlanInsert>;

@Injectable()
export class BenefitPlanRepository {
  private readonly db = this.scopedDb.getDb<typeof schema>();
  constructor(private readonly scopedDb: ScopedDbService) {}

  async insert(v: PlanInsert): Promise<PlanRow> {
    const [r] = await this.db.insert(schema.benefitPlans).values(v).returning(); return r!;
  }
  async findById(id: string): Promise<PlanRow | null> {
    const r = await this.db.query.benefitPlans.findFirst({ where: eq(schema.benefitPlans.id, id) }); return r ?? null;
  }
  async findMany(): Promise<PlanRow[]> {
    return this.db.query.benefitPlans.findMany({ orderBy: desc(schema.benefitPlans.createdAt) });
  }
  async update(id: string, v: PlanUpdate): Promise<PlanRow | null> {
    const [r] = await this.db.update(schema.benefitPlans).set({ ...v, updatedAt: new Date() }).where(eq(schema.benefitPlans.id, id)).returning(); return r ?? null;
  }
}
