import {  Inject , Injectable } from "@nestjs/common";
import { desc, eq } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import * as schema from "../../../../infrastructure/database/schema";

@Injectable()
export class TaskActivitiesRepository {

  constructor(@Inject(DATABASE_CONNECTION) private readonly db: AppDatabase) {
    this.db = this.db;
  }

  listByTaskId(taskId: string) {
    return this.db.query.taskActivities.findMany({
      where: eq(schema.taskActivities.taskId, taskId),
      with: {
        actor: true,
      },
      orderBy: [desc(schema.taskActivities.createdAt)],
    });
  }
}
