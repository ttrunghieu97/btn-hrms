import * as schema from "../../../../infrastructure/database/schema";
import { Inject, Injectable } from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import { attendances } from "../../../../infrastructure/database/schema";
import { and, count, desc, eq, sql, SQL } from "drizzle-orm";
import { createHash } from "node:crypto";
import { AttendanceQueryDto } from "../dto/attendance-query.dto";
import { BaseRepository } from "../../../../infrastructure/repositories/base.repository";
import { DataScope } from "../../../../core/security/types/data-scope.interface";
import { resolveSortOrder } from "../../../../shared/utils/sort.util";
import { safeLimit, safePage } from "../../../../shared/dto/pagination.dto";
import { MetricsService } from "../../../../shared/metrics/metrics.service";
import { throwConflict } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";


const ATTENDANCE_SORT_FIELDS = {
  createdAt: attendances.createdAt,
  updatedAt: attendances.updatedAt,
  date: attendances.date,
  time: attendances.time,
  employeeId: attendances.employeeId,
} as const;
type AttendanceSortField = keyof typeof ATTENDANCE_SORT_FIELDS;
const ATTENDANCE_SORT_ALIASES: Record<string, AttendanceSortField> = {
  id: "time",
  employee: "employeeId",
};


function advisoryLockKeys(
  employeeId: string | undefined | null,
  date: string | undefined | null,
  session: string | undefined | null,
  type: string | undefined | null,
): [number, number] | null {
  if (!employeeId || !date) return null;
  const raw = `${employeeId}:${date}:${session ?? ""}:${type ?? ""}`;
  const buf = createHash("sha256").update(raw).digest();
  // Two 32-bit integers for pg_try_advisory_xact_lock(key1, key2)
  const key1 = buf.readInt32BE(0);
  const key2 = buf.readInt32BE(4);
  return [key1, key2];
}

function isUniqueViolation(err: unknown): boolean {
  if (err && typeof err === "object") {
    const pgErr = err as { code?: string; constraint?: string };
    return pgErr.code === "23505";
  }
  return false;
}

function buildMonthRange(month: string) {
  const [yearPart = "", monthPart = ""] = month.split("-");
  const year = Number(yearPart);
  const monthNumber = Number(monthPart);

  if (!Number.isInteger(year) || !Number.isInteger(monthNumber)) {
    return null;
  }

  if (monthNumber < 1 || monthNumber > 12) {
    return null;
  }

  const normalizedMonth = String(monthNumber).padStart(2, "0");
  const firstDay = `${year}-${normalizedMonth}-01`;
  const lastDay = new Date(year, monthNumber, 0).getDate();
  const endDay = `${year}-${normalizedMonth}-${String(lastDay).padStart(2, "0")}`;

  return { firstDay, endDay };
}

@Injectable()
export class AttendancesRepository extends BaseRepository<
  typeof schema.attendances.$inferSelect,
  typeof schema.attendances.$inferInsert,
  Partial<typeof schema.attendances.$inferInsert>
> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly metricsService: MetricsService,
  ) {
    super();
  }

  async create(values: typeof schema.attendances.$inferInsert): Promise<typeof schema.attendances.$inferSelect> {
    return this.insertEvent(values);
  }

  async findById(id: string): Promise<typeof schema.attendances.$inferSelect | null> {
    return (await this.db.query.attendances.findFirst({
      where: eq(attendances.id, id),
    })) ?? null;
  }

  async findMany(query?: AttendanceQueryDto): Promise<typeof schema.attendances.$inferSelect[]> {
    if (!query) {
      return this.db.query.attendances.findMany();
    }
    const { rows } = await this.findAllPaginated(query);
    return rows;
  }

  async update(
    id: string,
    values: Partial<typeof schema.attendances.$inferInsert>,
  ): Promise<typeof schema.attendances.$inferSelect> {
    const [row] = await this.db
      .update(schema.attendances)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(schema.attendances.id, id))
      .returning();
    if (!row) throw new Error("attendance_not_found");
    return row;
  }

  async delete(id: string): Promise<void> {
    await this.db
      .delete(schema.attendances)
      .where(eq(schema.attendances.id, id));
  }

  async transaction<T>(cb: (tx: AppDatabase) => Promise<T>): Promise<T> {
    return this.db.transaction(cb);
  }

  async acquireAdvisoryLock(employeeId: string, tx: AppDatabase): Promise<void> {
    const raw = `${employeeId}`;
    const buf = createHash("sha256").update(raw).digest();
    const key1 = buf.readInt32BE(0);
    const key2 = buf.readInt32BE(4);
    
    const [locked] = await tx.execute(sql`SELECT pg_try_advisory_xact_lock(${key1}, ${key2}) AS locked`);
    if (!locked?.locked) {
      throwConflict(
        "This attendance is being processed by another request",
        ERROR_CODES.ATTENDANCE_ALREADY_RECORDED,
        { employeeId },
      );
    }
  }

  async insertEvent(values: typeof schema.attendances.$inferInsert, tx?: AppDatabase): Promise<typeof schema.attendances.$inferSelect> {
    const db = tx ?? this.db;
    const [row] = await db
      .insert(schema.attendances)
      .values(values)
      .returning();

    if (!row) throw new Error("failed_to_insert_attendance");
    return row;
  }

  async findMyAttendancePaginated(
    employeeId: string,
    query: AttendanceQueryDto,
  ) {
    const page = safePage(query.page);
    const limit = safeLimit(query.limit, 100);
    const { month } = query;
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [eq(attendances.employeeId, employeeId)];

    if (month) {
      const monthRange = buildMonthRange(month);
      if (!monthRange) {
        conditions.push(sql`1 = 0`);
      } else {
        conditions.push(sql`${attendances.date} >= ${monthRange.firstDay}`);
        conditions.push(sql`${attendances.date} <= ${monthRange.endDay}`);
      }
    }

    const where = and(...conditions);

    const rows = await this.db.query.attendances.findMany({
      where,
      orderBy: resolveSortOrder({
        sort: query.sort,
        fields: ATTENDANCE_SORT_FIELDS,
        defaultSort: [{ field: "time", direction: "desc" }],
        aliasMap: ATTENDANCE_SORT_ALIASES,
        tieBreaker: [desc(attendances.id)],
      }),
      limit,
      offset,
    });

    const [totalResult] = await this.db
      .select({ count: count() })
      .from(attendances)
      .where(where);

    return { rows, total: Number(totalResult?.count ?? 0), page, limit };
  }

  async findMyAttendanceAll(employeeId: string, month?: string) {
    const conditions: SQL[] = [eq(attendances.employeeId, employeeId)];

    if (month) {
      const monthRange = buildMonthRange(month);
      if (!monthRange) {
        conditions.push(sql`1 = 0`);
      } else {
        conditions.push(sql`${attendances.date} >= ${monthRange.firstDay}`);
        conditions.push(sql`${attendances.date} <= ${monthRange.endDay}`);
      }
    }

    return this.db.query.attendances.findMany({
      where: and(...conditions),
      orderBy: resolveSortOrder({
        fields: ATTENDANCE_SORT_FIELDS,
        defaultSort: [{ field: "time", direction: "desc" }],
        tieBreaker: [desc(attendances.id)],
      }),
    });
  }

  async findAllPaginated(query: AttendanceQueryDto, scope?: DataScope) {
    const page = safePage(query.page);
    const limit = safeLimit(query.limit, 100);
    const { from, to, date } = query;
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [];
    if (date) conditions.push(eq(attendances.date, date));
    if (from) conditions.push(sql`${attendances.date} >= ${from}`);
    if (to) conditions.push(sql`${attendances.date} <= ${to}`);

    if (scope) {
      if (scope.tier === 'self' && scope.employeeId) {
        conditions.push(eq(attendances.employeeId, scope.employeeId));
      } else if (scope.tier === 'department' && scope.departmentId) {
        conditions.push(sql`EXISTS (
          SELECT 1 FROM ${schema.orgAssignments}
          WHERE ${schema.orgAssignments.employeeId} = ${attendances.employeeId}
          AND ${schema.orgAssignments.departmentId} = ${scope.departmentId}
          AND ${schema.orgAssignments.isCurrent} = true
        )`);
      }
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await this.db.query.attendances.findMany({
      where,
      with: {
        employee: {
          with: {
            department: true,
            orgAssignments: true,
          },
        },
      },
      limit,
      offset,
      orderBy: resolveSortOrder({
        sort: query.sort,
        fields: ATTENDANCE_SORT_FIELDS,
        defaultSort: [{ field: "time", direction: "desc" }],
        aliasMap: ATTENDANCE_SORT_ALIASES,
        tieBreaker: [desc(attendances.id)],
      }),
    });

    const [totalResult] = await this.db
      .select({ count: count() })
      .from(attendances)
      .where(where);

    return { rows, total: Number(totalResult?.count ?? 0), page, limit };
  }

  findByDateWithEmployee(date: string) {
    return this.db.query.attendances.findMany({
      where: eq(attendances.date, date),
      with: {
        employee: { with: { department: true, orgAssignments: true } },
      },
      orderBy: resolveSortOrder({
        fields: ATTENDANCE_SORT_FIELDS,
        defaultSort: [{ field: "time", direction: "desc" }],
        tieBreaker: [desc(attendances.id)],
      }),
    });
  }
}



