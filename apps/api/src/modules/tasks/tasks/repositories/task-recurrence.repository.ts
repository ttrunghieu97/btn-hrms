import {  Inject , Injectable } from "@nestjs/common";
import { and, eq, lte } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import * as schema from "../../../../infrastructure/database/schema";

@Injectable()
export class TaskRecurrenceRepository {

  constructor(@Inject(DATABASE_CONNECTION) private readonly db: AppDatabase) {
    this.db = this.db;
  }

  findPendingRecurrences(now: Date) {
    return this.db.query.taskRecurrences.findMany({
      where: and(
        eq(schema.taskRecurrences.isActive, true),
        lte(schema.taskRecurrences.nextRunAt, now),
      ),
    });
  }

  updateRecurrence(
    input: {
      id: string;
      lastCreatedTaskId: string;
      nextRunAt: Date;
    },
  ) {
    return this.db
      .update(schema.taskRecurrences)
      .set({
        lastCreatedTaskId: input.lastCreatedTaskId,
        nextRunAt: input.nextRunAt,
        updatedAt: new Date(),
      })
      .where(eq(schema.taskRecurrences.id, input.id));
  }
}
