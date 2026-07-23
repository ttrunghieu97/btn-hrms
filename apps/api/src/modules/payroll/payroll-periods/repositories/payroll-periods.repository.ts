import { Inject, Injectable } from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import * as schema from "../../../../infrastructure/database/schema";
import { and, count, desc, eq, gte, lte, inArray } from "drizzle-orm";
import { BaseRepository } from "../../../../infrastructure/repositories/base.repository";
import { PayrollPeriodQueryDto } from "../dto/payroll-period-query.dto";

@Injectable()
export class PayrollPeriodsRepository extends BaseRepository<
  typeof schema.payrollPeriods.$inferSelect,
  typeof schema.payrollPeriods.$inferInsert,
  Partial<typeof schema.payrollPeriods.$inferInsert>
> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {
    super();
  }

  async findById(id: string) {
    const row = await this.db.query.payrollPeriods.findFirst({
      where: eq(schema.payrollPeriods.id, id),
    });
    return row ?? null;
  }

  findLockedPeriod(workDate: string) {
    return this.db.query.payrollPeriods.findFirst({
      where: and(
        lte(schema.payrollPeriods.startsOn, workDate),
        gte(schema.payrollPeriods.endsOn, workDate),
        inArray(schema.payrollPeriods.status, [
          "processing",
          "closed",
          "paid",
        ]),
      ),
    });
  }

  async findMany(query?: PayrollPeriodQueryDto) {
    if (!query) {
      return this.db.query.payrollPeriods.findMany({
        orderBy: [desc(schema.payrollPeriods.startsOn)],
      });
    }
    const { rows } = await this.list(query);
    return rows;
  }

  async list(query: PayrollPeriodQueryDto) {
    const { page = 1, limit = 20, status } = query;
    const offset = (page - 1) * limit;
    const conditions = [];

    if (status)
      conditions.push(eq(schema.payrollPeriods.status, status as NonNullable<typeof schema.payrollPeriods.$inferInsert['status']>));

    const where =
      conditions.length === 0
        ? undefined
        : conditions.length === 1
          ? conditions[0]
          : and(...conditions);

    const rows = await this.db.query.payrollPeriods.findMany({
      where,
      orderBy: [desc(schema.payrollPeriods.startsOn)],
      limit,
      offset,
    });

    const [totalResult] = await this.db
      .select({ value: count() })
      .from(schema.payrollPeriods)
      .where(where);

    return { rows, total: Number(totalResult?.value ?? 0), page, limit };
  }

  async create(values: typeof schema.payrollPeriods.$inferInsert) {
    const [row] = await this.db
      .insert(schema.payrollPeriods)
      .values(values)
      .returning();
    return row ?? null;
  }

  async update(
    id: string,
    values: Partial<typeof schema.payrollPeriods.$inferInsert>,
  ) {
    const [row] = await this.db
      .update(schema.payrollPeriods)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(schema.payrollPeriods.id, id))
      .returning();
    return row ?? null;
  }

  async delete(id: string) {
    await this.db
      .delete(schema.payrollPeriods)
      .where(eq(schema.payrollPeriods.id, id));
  }
}



