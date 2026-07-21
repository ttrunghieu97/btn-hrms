import { Injectable, Inject } from "@nestjs/common";
import { and, eq, isNull, sql, lt, ne, or } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import * as schema from "../../../../infrastructure/database/schema";

@Injectable()
export class MyTaskSummaryRepository {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: AppDatabase) {}

  async countByStatus(employeeId: string) {
    const rows = await this.db
      .select({
        status: schema.tasks.status,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(schema.tasks)
      .where(
        and(
          eq(schema.tasks.assigneeId, employeeId),
          isNull(schema.tasks.deletedAt),
          // exclude cancelled — not meaningful in summary
          ne(schema.tasks.status, "cancelled"),
        ),
      )
      .groupBy(schema.tasks.status);

    return rows;
  }

  async countOverdue(employeeId: string) {
    const [row] = await this.db
      .select({
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(schema.tasks)
      .where(
        and(
          eq(schema.tasks.assigneeId, employeeId),
          isNull(schema.tasks.deletedAt),
          lt(schema.tasks.dueDate, new Date()),
          ne(schema.tasks.status, "completed"),
          ne(schema.tasks.status, "cancelled"),
        ),
      );

    return row?.count ?? 0;
  }
}
