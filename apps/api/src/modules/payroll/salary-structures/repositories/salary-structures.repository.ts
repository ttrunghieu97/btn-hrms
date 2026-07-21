import { Inject, Injectable } from "@nestjs/common";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../../../infrastructure/database/schema";
import { SQL, and, count, desc, eq } from "drizzle-orm";
import { BaseRepository } from "../../../../infrastructure/repositories/base.repository";
import { SalaryStructureQueryDto } from "../dto/salary-structure-query.dto";

type SalaryStructureWithEmployee = typeof schema.salaryStructures.$inferSelect & {
  employee: typeof schema.employees.$inferSelect | null;
};

@Injectable()
export class SalaryStructuresRepository extends BaseRepository<
  typeof schema.salaryStructures.$inferSelect,
  typeof schema.salaryStructures.$inferInsert,
  Partial<typeof schema.salaryStructures.$inferInsert>,
  string,
  import("../../../../infrastructure/repositories/base.repository").FindOptions<typeof schema.salaryStructures.$inferSelect>,
  SalaryStructureWithEmployee
> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {
    super();
  }

  async findById(id: string): Promise<SalaryStructureWithEmployee | null> {
    const row = await this.db.query.salaryStructures.findFirst({
      where: eq(schema.salaryStructures.id, id),
      with: { employee: true },
    });
    return row ?? null;
  }

  async findMany(query?: SalaryStructureQueryDto): Promise<SalaryStructureWithEmployee[]> {
    return this.list(query ?? new SalaryStructureQueryDto()).then((r) => r.rows);
  }

  async create(data: typeof schema.salaryStructures.$inferInsert): Promise<SalaryStructureWithEmployee | null> {
    const [row] = await this.db
      .insert(schema.salaryStructures)
      .values(data)
      .returning();
    return row ? (await this.db.query.salaryStructures.findFirst({
      where: eq(schema.salaryStructures.id, row.id),
      with: { employee: true },
    })) ?? null : null;
  }

  async update(id: string, data: Partial<typeof schema.salaryStructures.$inferInsert>): Promise<SalaryStructureWithEmployee | null> {
    const [row] = await this.db
      .update(schema.salaryStructures)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.salaryStructures.id, id))
      .returning();
    return row ? (await this.db.query.salaryStructures.findFirst({
      where: eq(schema.salaryStructures.id, row.id),
      with: { employee: true },
    })) ?? null : null;
  }

  async delete(id: string): Promise<void> {
    await this.db
      .delete(schema.salaryStructures)
      .where(eq(schema.salaryStructures.id, id));
  }

  async list(query: SalaryStructureQueryDto = new SalaryStructureQueryDto()) {
    const { page = 1, limit = 20, employeeId } = query;
    const offset = (page - 1) * limit;
    const conditions: SQL[] = [];
    if (employeeId) {
      conditions.push(eq(schema.salaryStructures.employeeId, employeeId));
    }
    const where = conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions);
    const rows = await this.db.query.salaryStructures.findMany({
      where,
      with: { employee: true },
      orderBy: [desc(schema.salaryStructures.effectiveFrom)],
      limit,
      offset,
    });
    const [totalResult] = await this.db
      .select({ value: count() })
      .from(schema.salaryStructures)
      .where(where);
    return { rows, total: Number(totalResult?.value ?? 0), page, limit };
  }
}



