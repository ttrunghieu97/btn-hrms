import { Injectable, Inject } from "@nestjs/common";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import { AppDatabase, AppTransaction } from "../../../../infrastructure/database/database-client.type";
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  or,
  lt,
  ne,
  gte,
  isNull,
  max,
  type SQL,
} from "drizzle-orm";
import * as schema from "../../../../infrastructure/database/schema";
import {
  employees,
  taskAssignments,
  tasks,
  taskComments,
  taskAttachments,
  taskSubmissions,
} from "../../../../infrastructure/database/schema";
import { TaskQueryDto } from "../dto/task-query.dto";
import { BaseRepository } from "../../../../infrastructure/repositories/base.repository";
import { safeLimit, safePage } from "../../../../shared/dto/pagination.dto";

function buildTaskWhere(query: TaskQueryDto): SQL | undefined {
  const { search, status, assigneeId, priority, dueDate, overdue } = query;
  const isUuid =
    typeof assigneeId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assigneeId);

  const conditions: SQL[] = [isNull(schema.tasks.deletedAt)];
  if (status) conditions.push(eq(schema.tasks.status, status as NonNullable<typeof schema.tasks.$inferInsert['status']>));
  if (assigneeId && isUuid) conditions.push(eq(schema.tasks.assigneeId, assigneeId));
  if (priority) conditions.push(eq(schema.tasks.priority, priority as NonNullable<typeof schema.tasks.$inferInsert['priority']>));
  if (dueDate) {
    const d = new Date(dueDate);
    if (!isNaN(d.getTime())) {
      if (typeof dueDate === "string" && !dueDate.includes("T")) {
        const start = new Date(d);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        conditions.push(and(gte(schema.tasks.dueDate, start), lt(schema.tasks.dueDate, end))!);
      } else {
        conditions.push(eq(schema.tasks.dueDate, d));
      }
    }
  }
  if (overdue) {
    conditions.push(and(ne(schema.tasks.status, "completed"), lt(schema.tasks.dueDate, new Date()))!);
  }
  if (search) {
    conditions.push(or(ilike(schema.tasks.title, `%${search}%`), ilike(schema.tasks.description, `%${search}%`))!);
  }
  if (query.parentTaskId) {
    conditions.push(eq(schema.tasks.parentTaskId, query.parentTaskId));
  }
  return conditions.length === 0 ? undefined : and(...conditions);
}

@Injectable()
export class TasksRepository extends BaseRepository<
  typeof schema.tasks.$inferSelect,
  typeof schema.tasks.$inferInsert,
  Partial<typeof schema.tasks.$inferInsert>
> {

  constructor(@Inject(DATABASE_CONNECTION) private readonly db: AppDatabase) {
    super();
  }

  private executor(db?: AppDatabase | AppTransaction): AppDatabase | AppTransaction {
    return db ?? this.db;
  }

  async create(values: typeof schema.tasks.$inferInsert): Promise<typeof schema.tasks.$inferSelect> {
    return this.insert(values);
  }

  async findById(id: string) {
    return (await this.db.query.tasks.findFirst({
      where: and(eq(tasks.id, id), isNull(tasks.deletedAt)),
      with: {
        assignee: { with: { department: true } },
        createdBy: true,
        template: true,
        subtasks: true,
        parent: true,
        dependencies: { with: { dependsOnTask: true } },
      },
    })) ?? null;
  }

  async findMany(query?: TaskQueryDto) {
    const { rows } = await this.list(query ?? ({} as TaskQueryDto));
    return rows;
  }

  async findSubtasks(parentTaskId: string) {
    return this.db.query.tasks.findMany({
      where: and(
        eq(tasks.parentTaskId, parentTaskId),
        isNull(tasks.deletedAt),
      ),
      with: {
        assignee: { with: { department: true } },
      },
      orderBy: [asc(tasks.createdAt)],
    });
  }

  async update(
    id: string,
    values: Partial<typeof schema.tasks.$inferInsert>,
    db?: AppDatabase | AppTransaction,
  ): Promise<typeof schema.tasks.$inferSelect> {
    return this.updateById(id, values, db);
  }

  async delete(id: string): Promise<void> {
    await this.deleteById(id);
  }

  async insert(values: typeof schema.tasks.$inferInsert, db?: AppDatabase | AppTransaction): Promise<typeof schema.tasks.$inferSelect> {
    const [row] = await this.executor(db)
      .insert(schema.tasks)
      .values(values)
      .returning();
    if (!row) throw new Error("failed_to_insert_task");
    return row;
  }

  async updateById(
    id: string,
    values: Partial<typeof schema.tasks.$inferInsert>,
    db?: AppDatabase | AppTransaction,
  ): Promise<typeof schema.tasks.$inferSelect> {
    const [row] = await this.executor(db)
      .update(schema.tasks)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(schema.tasks.id, id))
      .returning();
    if (!row) throw new Error("task_not_found");
    return row;
  }

  async updateWithOptimisticLock(
    id: string,
    expectedStatus: string,
    values: Partial<typeof schema.tasks.$inferInsert>,
    db?: AppDatabase | AppTransaction,
  ): Promise<typeof schema.tasks.$inferSelect> {
    const [row] = await this.executor(db)
      .update(schema.tasks)
      .set({ ...values, updatedAt: new Date() })
      .where(and(eq(schema.tasks.id, id), eq(schema.tasks.status, expectedStatus as NonNullable<typeof schema.tasks.$inferInsert['status']>)))
      .returning();
    if (!row) throw new Error("task_conflict_or_not_found");
    return row;
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await this.db
      .update(schema.tasks)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(schema.tasks.id, id), isNull(schema.tasks.deletedAt)))
      .returning({ id: schema.tasks.id });
    return result.length > 0;
  }

  async list(query: TaskQueryDto) {
    const page = safePage(query.page);
    const limit = safeLimit(query.limit);
    const offset = (page - 1) * limit;
    const where = buildTaskWhere(query);

    const sortField = query.sortBy || 'updatedAt';
    const order = query.sortOrder || 'desc';

    const orderSpecs: any[] = [];
    if (sortField === 'dueDate') {
      orderSpecs.push(order === 'asc' ? asc(schema.tasks.dueDate) : desc(schema.tasks.dueDate));
    } else if (sortField === 'priority') {
      orderSpecs.push(order === 'asc' ? asc(schema.tasks.priority) : desc(schema.tasks.priority));
    } else if (sortField === 'status') {
      orderSpecs.push(order === 'asc' ? asc(schema.tasks.status) : desc(schema.tasks.status));
    } else if (sortField === 'progress') {
      orderSpecs.push(order === 'asc' ? asc(schema.tasks.progress) : desc(schema.tasks.progress));
    } else if (sortField === 'createdAt') {
      orderSpecs.push(order === 'asc' ? asc(schema.tasks.createdAt) : desc(schema.tasks.createdAt));
    } else {
      orderSpecs.push(order === 'asc' ? asc(schema.tasks.updatedAt) : desc(schema.tasks.updatedAt));
    }
    orderSpecs.push(asc(schema.tasks.createdAt));

    const rows = await this.db.query.tasks.findMany({
      where,
      with: {
        assignee: { with: { department: true } },
      },
      orderBy: orderSpecs,
      limit,
      offset,
    });
    const [totalResult] = await this.db.select({ count: count() }).from(schema.tasks).where(where);

    return { rows, total: Number(totalResult?.count ?? 0), page, limit };
  }

  async addAssignment(
    taskId: string,
    employeeId: string | null,
    assignedByUserId: string | null,
    db?: AppDatabase | AppTransaction,
  ): Promise<{ id: string }> {
    const [row] = await this.executor(db)
      .insert(schema.taskAssignments)
      .values({
        taskId,
        employeeId: employeeId ?? null,
        assignedByUserId: assignedByUserId ?? null,
      })
      .returning({ id: schema.taskAssignments.id });
    if (!row) throw new Error("failed_to_add_assignment");
    return row;
  }

  async getUserIdByEmployeeId(employeeId: string, db?: AppDatabase | AppTransaction): Promise<string | null> {
    const [row] = await this.executor(db)
      .select({ userId: employees.userId })
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1);
    return row?.userId ?? null;
  }

  async listAssignments(taskId: string) {
    return this.db.query.taskAssignments.findMany({
      where: eq(taskAssignments.taskId, taskId),
      with: {
        employee: { with: { department: true } },
        assignedBy: true,
      },
      orderBy: [desc(taskAssignments.assignedAt)],
    });
  }

  async addActivity(
    values: typeof schema.taskActivities.$inferInsert,
    db?: AppDatabase | AppTransaction,
  ): Promise<typeof schema.taskActivities.$inferSelect> {
    const [row] = await this.executor(db)
      .insert(schema.taskActivities)
      .values(values)
      .returning();
    if (!row) throw new Error("failed_to_add_activity");
    return row;
  }

  async listComments(taskId: string): Promise<any[]> {
    return this.db.query.taskComments.findMany({
      where: eq(taskComments.taskId, taskId),
      with: {
        author: {
          with: {
            employee: {
              with: {
                department: true
              }
            }
          }
        }
      },
      orderBy: [desc(taskComments.createdAt)],
    });
  }

  async addComment(values: typeof schema.taskComments.$inferInsert): Promise<typeof schema.taskComments.$inferSelect> {
    const [row] = await this.db
      .insert(schema.taskComments)
      .values(values)
      .returning();
    if (!row) throw new Error("failed_to_add_comment");
    return row;
  }

  async deleteComment(id: string): Promise<{ id: string }> {
    const [row] = await this.db
      .delete(schema.taskComments)
      .where(eq(schema.taskComments.id, id))
      .returning({ id: schema.taskComments.id });
    if (!row) throw new Error("comment_not_found");
    return row;
  }

  async listAttachments(taskId: string) {
    return this.db.query.taskAttachments.findMany({
      where: eq(taskAttachments.taskId, taskId),
      with: { uploadedBy: true },
      orderBy: [desc(taskAttachments.createdAt)],
    });
  }

  async addAttachment(values: typeof schema.taskAttachments.$inferInsert): Promise<typeof schema.taskAttachments.$inferSelect> {
    const [row] = await this.db
      .insert(schema.taskAttachments)
      .values(values)
      .returning();
    if (!row) throw new Error("failed_to_add_attachment");
    return row;
  }

  async deleteAttachment(id: string): Promise<{ id: string }> {
    const [row] = await this.db
      .delete(schema.taskAttachments)
      .where(eq(schema.taskAttachments.id, id))
      .returning({ id: schema.taskAttachments.id });
    if (!row) throw new Error("attachment_not_found");
    return row;
  }

  async listSubmissions(taskId: string) {
    return this.db.query.taskSubmissions.findMany({
      where: eq(taskSubmissions.taskId, taskId),
      with: { submittedBy: true },
      orderBy: [desc(taskSubmissions.submittedAt)],
    });
  }

  async addSubmission(
    values: typeof schema.taskSubmissions.$inferInsert,
    db?: AppDatabase | AppTransaction,
  ): Promise<typeof schema.taskSubmissions.$inferSelect> {
    const [row] = await this.executor(db)
      .insert(schema.taskSubmissions)
      .values(values)
      .returning();
    if (!row) throw new Error("failed_to_add_submission");
    return row;
  }

  async getNextSubmissionVersion(taskId: string, db?: AppDatabase | AppTransaction): Promise<number> {
    const [row] = await this.executor(db)
      .select({ value: max(taskSubmissions.version) })
      .from(taskSubmissions)
      .where(eq(taskSubmissions.taskId, taskId));
    const current = typeof row?.value === "number" ? row.value : 0;
    return current + 1;
  }

  async listReminderCandidates(now: Date, nextDay: Date) {
    return this.db.query.tasks.findMany({
      where: and(
        isNull(tasks.deletedAt),
        ne(tasks.status, "completed"),
        or(
          and(gte(tasks.dueDate, now), lt(tasks.dueDate, nextDay)),
          lt(tasks.dueDate, now),
        ),
        or(
          isNull(tasks.lastReminderAt),
          lt(tasks.lastReminderAt, new Date(now.toDateString())),
        ),
      ),
      with: { assignee: true },
    });
  }

  async updateReminderAt(taskId: string, at: Date): Promise<{ id: string }> {
    const [row] = await this.db
      .update(schema.tasks)
      .set({ lastReminderAt: at, updatedAt: new Date() })
      .where(eq(schema.tasks.id, taskId))
      .returning({ id: schema.tasks.id });
    if (!row) throw new Error("task_not_found");
    return row;
  }
}






