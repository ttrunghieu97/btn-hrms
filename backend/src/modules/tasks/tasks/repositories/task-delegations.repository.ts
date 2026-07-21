import {  Inject , Injectable } from "@nestjs/common";
import { and, eq, gt, isNull, lte, or } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import * as schema from "../../../../infrastructure/database/schema";

@Injectable()
export class TaskDelegationsRepository {

  constructor(@Inject(DATABASE_CONNECTION) private readonly db: AppDatabase) {
    this.db = this.db;
  }

  async create(    values: typeof schema.taskDelegations.$inferInsert) {
    const [row] = await this.db.insert(schema.taskDelegations).values(values).returning();
    return row ?? null;
  }

  listActiveByDelegator(delegatorUserId: string) {
    return this.db.query.taskDelegations.findMany({
      where: and(
        eq(schema.taskDelegations.delegatorUserId, delegatorUserId),
        eq(schema.taskDelegations.isActive, true),
        or(
          isNull(schema.taskDelegations.expiresAt),
          gt(schema.taskDelegations.expiresAt, new Date()),
        ),
        or(
          isNull(schema.taskDelegations.startsAt),
          lte(schema.taskDelegations.startsAt, new Date()),
        ),
      ),
      with: {
        delegatee: true,
      } as const,
    });
  }

  revoke(id: string, delegatorUserId: string) {
    return this.db
      .update(schema.taskDelegations)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(schema.taskDelegations.id, id),
          eq(schema.taskDelegations.delegatorUserId, delegatorUserId),
        ),
      );
  }
}
