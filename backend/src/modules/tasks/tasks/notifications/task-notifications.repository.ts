import * as schema from "../../../../infrastructure/database/schema";
import {  Inject , Injectable } from "@nestjs/common";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import {
  AppDatabase,
  AppTransaction,
} from "../../../../infrastructure/database/database-client.type";
import { desc, eq, and } from "drizzle-orm";

@Injectable()
export class TaskNotificationsRepository {

  constructor(@Inject(DATABASE_CONNECTION) private readonly db: AppDatabase) {
    this.db = this.db;
  }

  private executor(db?: AppDatabase | AppTransaction) {
    return db ?? this.db;
  }

  async create(
    data: typeof schema.taskNotifications.$inferInsert,
    db?: AppDatabase | AppTransaction,
  ) {
    const [row] = await this.executor(db)
      .insert(schema.taskNotifications)
      .values(data)
      .returning();
    return row;
  }

  async listByUser(userId: string, limit = 30) {
    return this.db.query.taskNotifications.findMany({
      where: eq(schema.taskNotifications.userId, userId),
      orderBy: [desc(schema.taskNotifications.createdAt)],
      limit,
    });
  }

  async markRead(userId: string, id: string) {
    // Drizzle update typing here only allows required insert fields; cast to allow isRead updates.
    const [row] = await this.db
      .update(schema.taskNotifications)
      .set({ isRead: true })
      .where(
        and(
          eq(schema.taskNotifications.userId, userId),
          eq(schema.taskNotifications.id, id),
        ),
      )
      .returning();
    return row;
  }

  async markAllRead(userId: string) {
    // Drizzle update typing here only allows required insert fields; cast to allow isRead updates.
    await this.db
      .update(schema.taskNotifications)
      .set({ isRead: true })
      .where(eq(schema.taskNotifications.userId, userId));
    return { ok: true };
  }
}
