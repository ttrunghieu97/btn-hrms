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
      .where(eq(schema.attendanceViolations.sessionId, sessionId));

    if (violations.length === 0) {
      return [];
    }

    return db
      .insert(schema.attendanceViolations)
      .values(violations)
      .returning();
  }

  async transaction<T>(cb: (tx: AppDatabase) => Promise<T>): Promise<T> {
    return this.db.transaction(cb);
  }
}
