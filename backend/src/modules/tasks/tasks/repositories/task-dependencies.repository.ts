import {  Inject , Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import * as schema from "../../../../infrastructure/database/schema";

@Injectable()
export class TaskDependenciesRepository {

  constructor(@Inject(DATABASE_CONNECTION) private readonly db: AppDatabase) {
    this.db = this.db;
  }

  listByTaskId(taskId: string) {
    return this.db.query.taskDependencies.findMany({
      where: eq(schema.taskDependencies.taskId, taskId),
      with: {
        dependsOnTask: true,
      } as const,
    });
  }

  findReverse(taskId: string, dependsOnTaskId: string) {
    return this.db.query.taskDependencies.findFirst({
      where: and(
        eq(schema.taskDependencies.taskId, taskId),
        eq(schema.taskDependencies.dependsOnTaskId, dependsOnTaskId),
      ),
    });
  }

  async create(values: typeof schema.taskDependencies.$inferInsert) {
    const [row] = await this.db.insert(schema.taskDependencies).values(values).returning();
    return row ?? null;
  }

  async remove(taskId: string, dependsOnTaskId: string) {
    const [row] = await this.db
      .delete(schema.taskDependencies)
      .where(
        and(
          eq(schema.taskDependencies.taskId, taskId),
          eq(schema.taskDependencies.dependsOnTaskId, dependsOnTaskId),
        ),
      )
      .returning();
    return row ?? null;
  }
}
