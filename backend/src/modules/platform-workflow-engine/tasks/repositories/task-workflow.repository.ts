import {  Inject , Injectable } from "@nestjs/common";
import { and, eq, gt, isNull, lte, or } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import * as schema from "../../../../infrastructure/database/schema";

@Injectable()
export class TaskWorkflowRepository {

  constructor(@Inject(DATABASE_CONNECTION) private readonly db: AppDatabase) {
    this.db = this.db;
  }

  async transaction<T>(work: (tx: AppDatabase) => Promise<T>): Promise<T> {
    return this.db.transaction((tx) => work(tx as AppDatabase));
  }

  async listBlockingDependencies(taskId: string) {
    return this.db.query.taskDependencies.findMany({
      where: and(
        eq(schema.taskDependencies.taskId, taskId),
        eq(schema.taskDependencies.type, "blocks"),
      ),
      with: { dependsOnTask: true } as const,
    });
  }

  async getMaxRevisionCountForPriority(priority: string | null | undefined) {
    if (!priority) return null;
    const slaRule = await this.db.query.taskSlaRules.findFirst({
      where: eq(schema.taskSlaRules.priority, priority as typeof schema.taskSlaRules.$inferInsert['priority']),
    });
    return slaRule?.maxRevisionCount ?? null;
  }

  async findCreatorScopedDelegation(input: {
    delegatorUserId: string;
    delegateeUserId: string;
  }) {
    return this.db.query.taskDelegations.findFirst({
      where: and(
        eq(schema.taskDelegations.delegatorUserId, input.delegatorUserId),
        eq(schema.taskDelegations.delegateeUserId, input.delegateeUserId),
        eq(schema.taskDelegations.isActive, true),
        isNull(schema.taskDelegations.departmentId),
        or(
          isNull(schema.taskDelegations.expiresAt),
          gt(schema.taskDelegations.expiresAt, new Date()),
        ),
        or(
          isNull(schema.taskDelegations.startsAt),
          lte(schema.taskDelegations.startsAt, new Date()),
        ),
      ),
    });
  }

  async findDepartmentScopedDelegation(input: {
    departmentId: string;
    delegateeUserId: string;
  }) {
    return this.db.query.taskDelegations.findFirst({
      where: and(
        eq(schema.taskDelegations.departmentId, input.departmentId),
        eq(schema.taskDelegations.delegateeUserId, input.delegateeUserId),
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
    });
  }
}
