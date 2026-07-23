import {  Inject , Injectable } from "@nestjs/common";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import * as schema from "../../../../infrastructure/database/schema";

@Injectable()
export class TaskSlaRepository {

  constructor(@Inject(DATABASE_CONNECTION) private readonly db: AppDatabase) {
    this.db = this.db;
  }

  findActiveTasks() {
    const activeStatuses = ["created", "assigned", "in_progress", "revision"];
    return this.db.query.tasks.findMany({
      where: and(
        isNull(schema.tasks.deletedAt),
        inArray(schema.tasks.status, activeStatuses as NonNullable<typeof schema.tasks.$inferInsert['status']>[]),
      ),
      with: {
        assignee: true,
      } as const,
    });
  }

  findSubmittedTasks() {
    return this.db.query.tasks.findMany({
      where: and(
        isNull(schema.tasks.deletedAt),
        eq(schema.tasks.status, "submitted"),
      ),
      with: {
        assignee: true,
      } as const,
    });
  }

  findSlaRuleByPriority(priority: string) {
    return this.db.query.taskSlaRules.findFirst({
      where: eq(schema.taskSlaRules.priority, priority as NonNullable<typeof schema.taskSlaRules.$inferInsert['priority']>),
    });
  }

  findSlaRulesByPriorities(priorities: string[]) {
    if (!priorities.length) return Promise.resolve([]);
    return this.db.query.taskSlaRules.findMany({
      where: inArray(schema.taskSlaRules.priority, priorities as NonNullable<typeof schema.taskSlaRules.$inferInsert['priority']>[]),
    });
  }
}



