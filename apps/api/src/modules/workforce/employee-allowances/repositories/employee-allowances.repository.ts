import { Inject, Injectable } from "@nestjs/common";
import { and, eq, desc } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import { allowances } from "../../../../infrastructure/database/schema";
import type { AppDatabase } from "../../../../infrastructure/database/database-client.type";

@Injectable()
export class EmployeeAllowancesRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: AppDatabase,
  ) {}

  async findByEmployeeId(employeeId: string) {
    return this.db
      .select()
      .from(allowances)
      .where(eq(allowances.employeeId, employeeId))
      .orderBy(desc(allowances.effectiveFrom));
  }

  async findById(id: string) {
    const result = await this.db
      .select()
      .from(allowances)
      .where(eq(allowances.id, id))
      .limit(1);
    return result[0] ?? null;
  }

  async create(data: typeof allowances.$inferInsert) {
    const [row] = await this.db
      .insert(allowances)
      .values(data)
      .returning();
    return row ?? null;
  }

  async update(id: string, data: Partial<typeof allowances.$inferInsert>) {
    const [row] = await this.db
      .update(allowances)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(allowances.id, id))
      .returning();
    return row ?? null;
  }

  async delete(id: string) {
    const [row] = await this.db
      .delete(allowances)
      .where(eq(allowances.id, id))
      .returning();
    return row ?? null;
  }
}
