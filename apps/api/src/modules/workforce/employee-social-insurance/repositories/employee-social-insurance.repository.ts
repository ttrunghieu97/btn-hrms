import { Inject, Injectable } from "@nestjs/common";
import { and, eq, desc, isNull } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import { socialInsuranceEnrollments } from "../../../../infrastructure/database/schema";
import type { AppDatabase } from "../../../../infrastructure/database/database-client.type";

@Injectable()
export class EmployeeSocialInsuranceRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: AppDatabase,
  ) {}

  async findByEmployeeId(employeeId: string) {
    return this.db
      .select()
      .from(socialInsuranceEnrollments)
      .where(eq(socialInsuranceEnrollments.employeeId, employeeId))
      .orderBy(desc(socialInsuranceEnrollments.startDate));
  }

  async findById(id: string) {
    const result = await this.db
      .select()
      .from(socialInsuranceEnrollments)
      .where(eq(socialInsuranceEnrollments.id, id))
      .limit(1);
    return result[0] ?? null;
  }

  async findActiveByEmployeeId(employeeId: string) {
    const result = await this.db
      .select()
      .from(socialInsuranceEnrollments)
      .where(
        and(
          eq(socialInsuranceEnrollments.employeeId, employeeId),
          eq(socialInsuranceEnrollments.status, "active"),
        ),
      )
      .limit(1);
    return result[0] ?? null;
  }

  async create(data: typeof socialInsuranceEnrollments.$inferInsert) {
    const [row] = await this.db
      .insert(socialInsuranceEnrollments)
      .values(data)
      .returning();
    return row ?? null;
  }

  async update(id: string, data: Partial<typeof socialInsuranceEnrollments.$inferInsert>) {
    const [row] = await this.db
      .update(socialInsuranceEnrollments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(socialInsuranceEnrollments.id, id))
      .returning();
    return row ?? null;
  }

  async delete(id: string) {
    const [row] = await this.db
      .delete(socialInsuranceEnrollments)
      .where(eq(socialInsuranceEnrollments.id, id))
      .returning();
    return row ?? null;
  }
}
