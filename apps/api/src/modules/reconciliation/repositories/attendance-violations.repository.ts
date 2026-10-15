import { Inject, Injectable } from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, and } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";
import { AppDatabase } from "../../../infrastructure/database/database-client.type";
import * as schema from "../../../infrastructure/database/schema";

type ViolationRow = typeof schema.attendanceViolations.$inferSelect;
type ViolationInsert = typeof schema.attendanceViolations.$inferInsert;

@Injectable()
export class AttendanceViolationsRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async findBySession(sessionId: string): Promise<ViolationRow[]> {
    return this.db.query.attendanceViolations.findMany({
      where: eq(schema.attendanceViolations.sessionId, sessionId),
    });
  }

  async findByEmployee(employeeId: string): Promise<ViolationRow[]> {
    return this.db.query.attendanceViolations.findMany({
      where: eq(schema.attendanceViolations.employeeId, employeeId),
    });
  }

  async replaceViolationsForSession(
    sessionId: string,
    violations: ViolationInsert[],
    tx?: AppDatabase,
  ): Promise<ViolationRow[]> {
    const db = tx ?? this.db;

    await db
      .delete(schema.attendanceViolations)
      .where(
        and(
          eq(schema.attendanceViolations.sessionId, sessionId),
          eq(schema.attendanceViolations.status, "OPEN"),
        ),
      );

    if (violations.length === 0) {
      return [];
    }

    const preserved =
      typeof db.query?.attendanceViolations?.findMany === "function"
        ? await db.query.attendanceViolations.findMany({
            where: eq(schema.attendanceViolations.sessionId, sessionId),
          })
        : [];
    const preservedCodes = new Set(preserved.map((v) => v.code));

    const toInsert = violations.filter((v) => !preservedCodes.has(v.code));
    if (toInsert.length === 0) {
      return preserved;
    }

    const inserted = await db
      .insert(schema.attendanceViolations)
      .values(toInsert)
      .onConflictDoNothing()
      .returning();

    return [...preserved, ...inserted];
  }

  async transaction<T>(cb: (tx: AppDatabase) => Promise<T>): Promise<T> {
    return this.db.transaction(cb);
  }
}
