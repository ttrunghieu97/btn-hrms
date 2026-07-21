import { Inject, Injectable } from "@nestjs/common";
import { and, count, eq, isNull, sql } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import type { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import { attendances, employees, leaveRequests, tasks } from "../../../../infrastructure/database/schema";

@Injectable()
export class DataIntegrityRepository {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: AppDatabase) {}

  async countEmployeesWithoutDepartment() {
    const result = await this.db
      .select({ count: count() })
      .from(employees)
      .where(
        and(
          isNull(employees.departmentId),
          isNull(employees.deletedAt),
          eq(employees.status, "working"),
        ),
      );
    return Number(result[0]?.count ?? 0);
  }

  async countEmployeesWithoutUser() {
    const result = await this.db
      .select({ count: count() })
      .from(employees)
      .where(and(isNull(employees.userId), isNull(employees.deletedAt)));
    return Number(result[0]?.count ?? 0);
  }

  async countOrphanAttendances() {
    const result = await this.db
      .select({ count: count() })
      .from(attendances)
      .leftJoin(employees, eq(attendances.employeeId, employees.id))
      .where(isNull(employees.id));
    return Number(result[0]?.count ?? 0);
  }

  async countStalledTasks(updatedBefore: Date) {
    const result = await this.db
      .select({ count: count() })
      .from(tasks)
      .where(
        and(
          sql`${tasks.status} NOT IN ('completed', 'cancelled')`,
          sql`${tasks.updatedAt} < ${updatedBefore}`,
          isNull(tasks.deletedAt),
        ),
      );
    return Number(result[0]?.count ?? 0);
  }

  async countStaleLeaveRequests(requestedBefore: Date) {
    const result = await this.db
      .select({ count: count() })
      .from(leaveRequests)
      .where(
        and(
          eq(leaveRequests.status, "pending"),
          sql`${leaveRequests.requestedAt} < ${requestedBefore}`,
        ),
      );
    return Number(result[0]?.count ?? 0);
  }

  async countDuplicateEmployeeCodes() {
    const dupes = await this.db.execute(
      sql`SELECT COUNT(*) as cnt FROM (
        SELECT employee_code FROM employees
        WHERE deleted_at IS NULL
        GROUP BY employee_code
        HAVING COUNT(*) > 1
      ) sub`,
    );
    return Number(dupes[0]?.cnt ?? 0);
  }
}
