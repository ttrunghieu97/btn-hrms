import { Injectable } from "@nestjs/common";
import { eq, desc } from "drizzle-orm";
import * as schema from "../../../../infrastructure/database/schema";
import { ScopedDbService } from "../../../../infrastructure/database/scoped-db.service";
export type ClaimRow = typeof schema.expenseClaims.$inferSelect;
export type ClaimInsert = typeof schema.expenseClaims.$inferInsert;
export type ClaimUpdate = Partial<ClaimInsert>;
@Injectable()
export class ExpenseClaimRepository {
  private readonly db = this.scopedDb.getDb<typeof schema>();
  constructor(private readonly scopedDb: ScopedDbService) {}
  async insert(v: ClaimInsert): Promise<ClaimRow> {
    const [r] = await this.db.insert(schema.expenseClaims).values(v).returning(); return r!;
  }
  async findById(id: string): Promise<ClaimRow | null> {
    const r = await this.db.query.expenseClaims.findFirst({ where: eq(schema.expenseClaims.id, id) }); return r ?? null;
  }
  async findMany(employeeId?: string): Promise<ClaimRow[]> {
    const where = employeeId ? eq(schema.expenseClaims.employeeId, employeeId) : undefined;
    return this.db.query.expenseClaims.findMany({ where, orderBy: desc(schema.expenseClaims.createdAt) });
  }
  async update(id: string, v: ClaimUpdate): Promise<ClaimRow | null> {
    const [r] = await this.db.update(schema.expenseClaims).set({ ...v, updatedAt: new Date() }).where(eq(schema.expenseClaims.id, id)).returning(); return r ?? null;
  }
  async addItem(v: typeof schema.expenseItems.$inferInsert): Promise<void> {
    await this.db.insert(schema.expenseItems).values(v);
  }
  async removeItem(id: string): Promise<void> {
    await this.db.delete(schema.expenseItems).where(eq(schema.expenseItems.id, id));
  }
  async findItems(claimId: string): Promise<typeof schema.expenseItems.$inferSelect[]> {
    return this.db.query.expenseItems.findMany({ where: eq(schema.expenseItems.claimId, claimId) });
  }
}
