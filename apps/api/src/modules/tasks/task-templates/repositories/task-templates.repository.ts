import {  Inject , Injectable } from "@nestjs/common";
import { desc, eq } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import * as schema from "../../../../infrastructure/database/schema";

@Injectable()
export class TaskTemplatesRepository {

  constructor(@Inject(DATABASE_CONNECTION) private readonly db: AppDatabase) {
    this.db = this.db;
  }

  findAll() {
    return this.db.query.taskTemplates.findMany({
      orderBy: [desc(schema.taskTemplates.createdAt)],
    });
  }

  findById(id: string) {
    return this.db.query.taskTemplates.findFirst({
      where: eq(schema.taskTemplates.id, id),
    });
  }

  async create(values: typeof schema.taskTemplates.$inferInsert) {
    const [template] = await this.db
      .insert(schema.taskTemplates)
      .values(values)
      .returning();
    return template ?? null;
  }

  async update(id: string, values: Partial<typeof schema.taskTemplates.$inferInsert>) {
    const [updated] = await this.db
      .update(schema.taskTemplates)
      .set(values)
      .where(eq(schema.taskTemplates.id, id))
      .returning();
    return updated ?? null;
  }

  async delete(id: string) {
    const [deleted] = await this.db
      .delete(schema.taskTemplates)
      .where(eq(schema.taskTemplates.id, id))
      .returning();
    return deleted ?? null;
  }

  updateTaskTemplateLink(taskId: string, templateId: string) {
    return this.db
      .update(schema.tasks)
      .set({ templateId })
      .where(eq(schema.tasks.id, taskId));
  }
}
