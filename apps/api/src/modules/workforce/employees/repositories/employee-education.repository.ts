import { Inject, Injectable } from "@nestjs/common";
import { and, eq, inArray, sql } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import type { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import { employeeEducations } from "../../../../infrastructure/database/schema";
import type { EducationLevel } from "../dto/education.dto";

const EDUCATION_RANK: Record<string, number> = {
  other: 0,
  primary: 10,
  lower_secondary: 20,
  upper_secondary: 30,
  vocational: 35,
  college: 40,
  bachelor: 50,
  master: 60,
  doctor: 70,
};

@Injectable()
export class EmployeeEducationRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: AppDatabase,
  ) {}

  async findByEmployeeId(employeeId: string) {
    return this.db
      .select()
      .from(employeeEducations)
      .where(
        and(
          eq(employeeEducations.employeeId, employeeId),
          sql`${employeeEducations.deletedAt} is null`,
        ),
      )
      .orderBy(employeeEducations.educationLevel);
  }

  async findById(id: string) {
    const [row] = await this.db
      .select()
      .from(employeeEducations)
      .where(
        and(
          eq(employeeEducations.id, id),
          sql`${employeeEducations.deletedAt} is null`,
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async create(
    data: typeof employeeEducations.$inferInsert,
    tx?: AppDatabase,
  ) {
    const db = tx ?? this.db;
    const [row] = await db.insert(employeeEducations).values(data).returning();
    return row!;
  }

  async update(
    id: string,
    data: Partial<typeof employeeEducations.$inferInsert>,
    tx?: AppDatabase,
  ) {
    const db = tx ?? this.db;
    const [row] = await db
      .update(employeeEducations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(employeeEducations.id, id))
      .returning();
    return row ?? null;
  }

  async softDelete(id: string, tx?: AppDatabase) {
    const db = tx ?? this.db;
    await db
      .update(employeeEducations)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(employeeEducations.id, id));
  }

  async getHighestLevel(
    employeeId: string,
  ): Promise<EducationLevel | null> {
    const rows = await this.db
      .select({ level: employeeEducations.educationLevel })
      .from(employeeEducations)
      .where(
        and(
          eq(employeeEducations.employeeId, employeeId),
          sql`${employeeEducations.deletedAt} is null`,
        ),
      );

    if (rows.length === 0) return null;

    let highest: EducationLevel | null = null;
    let highestRank = -1;
    for (const r of rows) {
      const rank = EDUCATION_RANK[r.level] ?? 0;
      if (rank > highestRank) {
        highestRank = rank;
        highest = r.level as EducationLevel;
      }
    }
    return highest;
  }
}
