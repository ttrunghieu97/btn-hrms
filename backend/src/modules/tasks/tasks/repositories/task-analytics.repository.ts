import {  Inject , Injectable } from "@nestjs/common";
import { and, eq, gte, isNull, lte, sql, type SQL } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import * as schema from "../../../../infrastructure/database/schema";

@Injectable()
export class TaskAnalyticsRepository {

  constructor(@Inject(DATABASE_CONNECTION) private readonly db: AppDatabase) {
    this.db = this.db;
  }

  buildTaskWhere(filters: { departmentId?: string; startDate?: string; endDate?: string }) {
    const conditions: (SQL<any> | undefined)[] = [isNull(schema.tasks.deletedAt)];

    const eventEndDate = filters.endDate
      ? (() => {
          const endDate = new Date(filters.endDate);
          endDate.setDate(endDate.getDate() + 1);
          return endDate;
        })()
      : undefined;

    if (filters.departmentId) {
      conditions.push(eq(schema.employees.departmentId, filters.departmentId));
    }

    if (filters.startDate) {
      conditions.push(gte(schema.tasks.createdAt, new Date(filters.startDate)));
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setDate(endDate.getDate() + 1);
      conditions.push(lte(schema.tasks.createdAt, endDate));
    }

    const validConditions = conditions.filter((c) => c !== undefined);
    return { whereClause: and(...validConditions), eventEndDate };
  }

  statusDistribution(whereClause: SQL<any>, departmentId?: string) {
    if (departmentId) {
      return this.db
        .select({
          status: schema.tasks.status,
          count: sql<number>`count(*)`.mapWith(Number),
        })
        .from(schema.tasks)
        .leftJoin(schema.employees, eq(schema.tasks.assigneeId, schema.employees.id))
        .where(whereClause)
        .groupBy(schema.tasks.status);
    }

    return this.db
      .select({
        status: schema.tasks.status,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(schema.tasks)
      .where(whereClause)
      .groupBy(schema.tasks.status);
  }

  priorityDistribution(whereClause: SQL<any>, departmentId?: string) {
    if (departmentId) {
      return this.db
        .select({
          priority: schema.tasks.priority,
          count: sql<number>`count(*)`.mapWith(Number),
        })
        .from(schema.tasks)
        .leftJoin(schema.employees, eq(schema.tasks.assigneeId, schema.employees.id))
        .where(whereClause)
        .groupBy(schema.tasks.priority);
    }

    return this.db
      .select({
        priority: schema.tasks.priority,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(schema.tasks)
      .where(whereClause)
      .groupBy(schema.tasks.priority);
  }

  overdueCount(whereClause: SQL<any>, departmentId?: string) {
    if (departmentId) {
      return this.db
        .select({
          count: sql<number>`count(*)`.mapWith(Number),
        })
        .from(schema.tasks)
        .leftJoin(schema.employees, eq(schema.tasks.assigneeId, schema.employees.id))
        .where(
          and(
            whereClause,
            sql`${schema.tasks.dueDate} < now()`,
            sql`${schema.tasks.status} != 'completed'`,
          ),
        );
    }

    return this.db
      .select({
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(schema.tasks)
      .where(
        and(
          whereClause,
          sql`${schema.tasks.dueDate} < now()`,
          sql`${schema.tasks.status} != 'completed'`,
        ),
      );
  }

  slaBreachCount(input: {
    departmentId?: string;
    startDate?: string;
    eventEndDate?: Date;
  }) {
    if (input.departmentId) {
      return this.db
        .select({
          count: sql<number>`count(*)`.mapWith(Number),
        })
        .from(schema.taskEvents)
        .leftJoin(schema.tasks, eq(schema.taskEvents.aggregateId, schema.tasks.id))
        .leftJoin(schema.employees, eq(schema.tasks.assigneeId, schema.employees.id))
        .where(
          and(
            eq(schema.taskEvents.eventType, "task.overdue"),
            input.startDate
              ? gte(schema.taskEvents.occurredAt, new Date(input.startDate))
              : undefined,
            input.eventEndDate
              ? lte(schema.taskEvents.occurredAt, input.eventEndDate)
              : undefined,
            input.departmentId
              ? eq(schema.employees.departmentId, input.departmentId)
              : undefined,
          ),
        );
    }

    return this.db
      .select({
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(schema.taskEvents)
      .where(
        and(
          eq(schema.taskEvents.eventType, "task.overdue"),
          input.startDate
            ? gte(schema.taskEvents.occurredAt, new Date(input.startDate))
            : undefined,
          input.eventEndDate
            ? lte(schema.taskEvents.occurredAt, input.eventEndDate)
            : undefined,
        ),
      );
  }
}

