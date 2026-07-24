import { Injectable, Inject } from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, and, sql } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import * as schema from "../../../../infrastructure/database/schema";

type SessionType = "MORNING" | "AFTERNOON" | "LUNCH_DUTY" | "NIGHT" | "OT";
type SessionStatus = "READY" | "IN_PROGRESS" | "COMPLETED" | "MISSED" | "CANCELLED";
type SessionRow = typeof schema.attendanceSessions.$inferSelect;
type SessionInsert = typeof schema.attendanceSessions.$inferInsert;

@Injectable()
export class AttendanceSessionRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async findTodaySessions(employeeId: string, date: string): Promise<SessionRow[]> {
    return this.db.query.attendanceSessions.findMany({
      where: and(
        eq(schema.attendanceSessions.employeeId, employeeId),
        eq(schema.attendanceSessions.date, date),
      ),
      orderBy: (sessions, { asc }) => [asc(sessions.createdAt)],
    });
  }

  async findSessionsByDateRange(
    employeeId: string,
    startDate: string,
    endDate: string,
  ): Promise<SessionRow[]> {
    return this.db.query.attendanceSessions.findMany({
      where: and(
        eq(schema.attendanceSessions.employeeId, employeeId),
        sql`${schema.attendanceSessions.date} >= ${startDate}`,
        sql`${schema.attendanceSessions.date} <= ${endDate}`,
      ),
      orderBy: (sessions, { asc }) => [asc(sessions.date), asc(sessions.createdAt)],
    });
  }

  async findActiveSession(
    employeeId: string,
    _date?: string,
    tx?: AppDatabase,
  ): Promise<SessionRow | null> {
    const db = tx ?? this.db;
    const rows = await db.query.attendanceSessions.findMany({
      where: and(
        eq(schema.attendanceSessions.employeeId, employeeId),
        eq(schema.attendanceSessions.status, "IN_PROGRESS"),
      ),
      limit: 1,
    });
    return rows[0] ?? null;
  }

  async findByEmployeeAndType(
    employeeId: string,
    date: string,
    sessionType: SessionType,
    tx?: AppDatabase,
  ): Promise<SessionRow | null> {
    const db = tx ?? this.db;
    const rows = await db.query.attendanceSessions.findMany({
      where: and(
        eq(schema.attendanceSessions.employeeId, employeeId),
        eq(schema.attendanceSessions.date, date),
        eq(schema.attendanceSessions.sessionType, sessionType),
      ),
      orderBy: (sessions, { desc }) => [desc(sessions.createdAt)],
      limit: 1,
    });
    return rows[0] ?? null;
  }

  async findReadySession(employeeId: string, date: string): Promise<SessionRow | null> {
    const rows = await this.db.query.attendanceSessions.findMany({
      where: and(
        eq(schema.attendanceSessions.employeeId, employeeId),
        eq(schema.attendanceSessions.date, date),
        eq(schema.attendanceSessions.status, "READY"),
      ),
      orderBy: (sessions, { asc }) => [asc(sessions.createdAt)],
      limit: 1,
    });
    return rows[0] ?? null;
  }

  async create(values: SessionInsert, tx?: AppDatabase): Promise<SessionRow> {
    const db = tx ?? this.db;
    try {
      const [row] = await db.insert(schema.attendanceSessions).values(values).returning();
      if (row) return row;
    } catch (err: any) {
      if (err?.code === "23505") {
        const existing = await db.query.attendanceSessions.findFirst({
          where: and(
            eq(schema.attendanceSessions.employeeId, values.employeeId),
            eq(schema.attendanceSessions.date, values.date),
            eq(schema.attendanceSessions.sessionType, values.sessionType),
          ),
        });
        if (existing) return existing;
      }
      throw err;
    }
    throw new Error("failed_to_insert_session");
  }

  async updateStatus(
    id: string,
    status: SessionStatus,
    updates?: Partial<{ actualStart: Date; actualEnd: Date }>,
    tx?: AppDatabase,
  ): Promise<void> {
    const db = tx ?? this.db;
    await db
      .update(schema.attendanceSessions)
      .set({
        status,
        ...(updates?.actualStart ? { actualStart: updates.actualStart } : {}),
        ...(updates?.actualEnd ? { actualEnd: updates.actualEnd } : {}),
        updatedAt: sql`now()`,
      })
      .where(eq(schema.attendanceSessions.id, id));
  }

  async transaction<T>(cb: (tx: AppDatabase) => Promise<T>): Promise<T> {
    return this.db.transaction(cb);
  }
}
