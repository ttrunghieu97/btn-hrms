import { Inject, Injectable } from "@nestjs/common";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import { type AppDatabase } from "../../../../infrastructure/database/database-client.type";
import * as schema from "../../../../infrastructure/database/schema";
import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { DataScope } from "../../../../core/security/types/data-scope.interface";
import { OvertimeQueryDto } from "../dto/overtime.dto";

@Injectable()
export class OvertimeRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: AppDatabase,
  ) {}

  async findById(id: string, tx: AppDatabase = this.db) {
    const row = await tx.query.attendanceOvertimeRequests.findFirst({
      where: eq(schema.attendanceOvertimeRequests.id, id),
    });
    return row ?? null;
  }

  async findByEmployeeAndDate(employeeId: string, workDate: string) {
    return this.db.query.attendanceOvertimeRequests.findFirst({
      where: and(
        eq(schema.attendanceOvertimeRequests.employeeId, employeeId),
        eq(schema.attendanceOvertimeRequests.workDate, workDate),
      ),
    });
  }

  async create(data: typeof schema.attendanceOvertimeRequests.$inferInsert) {
    const [row] = await this.db
      .insert(schema.attendanceOvertimeRequests)
      .values(data)
      .returning();
    return row ?? null;
  }

  async update(
    id: string,
    data: Partial<typeof schema.attendanceOvertimeRequests.$inferInsert>,
    tx: AppDatabase = this.db,
  ) {
    const [row] = await tx
      .update(schema.attendanceOvertimeRequests)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.attendanceOvertimeRequests.id, id))
      .returning();
    return row ?? null;
  }

  async findMany(
    query: OvertimeQueryDto = {},
    scope?: DataScope,
  ) {
    const conditions: SQL[] = [];

    if (query.status) {
      conditions.push(
        eq(schema.attendanceOvertimeRequests.status, query.status),
      );
    }
    if (query.workDate) {
      conditions.push(
        eq(schema.attendanceOvertimeRequests.workDate, query.workDate),
      );
    }

    if (scope?.tier === "self" && scope.employeeId) {
      conditions.push(
        eq(schema.attendanceOvertimeRequests.employeeId, scope.employeeId),
      );
    } else {
      if (query.employeeId) {
        conditions.push(
          eq(schema.attendanceOvertimeRequests.employeeId, query.employeeId),
        );
      }

      if (scope?.tier === "department" && scope.departmentId) {
        conditions.push(sql`EXISTS (
          SELECT 1 FROM ${schema.orgAssignments}
          WHERE ${schema.orgAssignments.employeeId} = ${schema.attendanceOvertimeRequests.employeeId}
          AND ${schema.orgAssignments.departmentId} = ${scope.departmentId}
          AND ${schema.orgAssignments.isCurrent} = true
        )`);
      }
    }

    const where =
      conditions.length === 0
        ? undefined
        : conditions.length === 1
          ? conditions[0]
          : and(...conditions);

    return this.db.query.attendanceOvertimeRequests.findMany({
      where,
      orderBy: [desc(schema.attendanceOvertimeRequests.createdAt)],
    });
  }

  async transaction<T>(
    callback: (tx: AppDatabase) => Promise<T>,
  ): Promise<T> {
    return this.db.transaction(callback);
  }

  async delete(id: string): Promise<void> {
    await this.db
      .delete(schema.attendanceOvertimeRequests)
      .where(eq(schema.attendanceOvertimeRequests.id, id));
  }
}



