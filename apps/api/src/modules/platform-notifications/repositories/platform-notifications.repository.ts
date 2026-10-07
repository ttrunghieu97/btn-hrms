import {  Inject , Injectable } from "@nestjs/common";
import { eq, inArray } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";
import { AppDatabase } from "../../../infrastructure/database/database-client.type";
import {
  notificationPreferences,
  notifications,
  notificationTemplates,
  users,
} from "../../../infrastructure/database/schema";

@Injectable()
export class PlatformNotificationsRepository {

  constructor(@Inject(DATABASE_CONNECTION) private readonly db: AppDatabase) {
    this.db = this.db;
  }

  findUserIdentity(userId: string) {
    return this.db.query.users.findFirst({
      columns: { id: true, email: true },
      where: eq(users.id, userId),
    });
  }

  findUserIdentities(userIds: string[]) {
    return this.db.query.users.findMany({
      columns: { id: true, email: true },
      where: inArray(users.id, userIds),
    });
  }

  findTemplateByName(name: string) {
    return this.db.query.notificationTemplates.findFirst({
      where: eq(notificationTemplates.name, name),
    });
  }

  findTemplateById(id: string) {
    return this.db.query.notificationTemplates.findFirst({
      where: eq(notificationTemplates.id, id),
    });
  }

  listTemplates() {
    return this.db.query.notificationTemplates.findMany({
      orderBy: (templates, { desc }) => [desc(templates.createdAt)],
    });
  }

  async insertTemplate(input: {
    name: string;
    type: typeof notificationTemplates.$inferInsert['type'];
    subject?: string | null;
    body: string;
  }) {
    const [template] = await this.db
      .insert(notificationTemplates)
      .values({
        name: input.name,
        type: input.type,
        subject: input.subject ?? null,
        body: input.body,
      })
      .returning();
    return template ?? null;
  }

  async updateTemplate(
    id: string,
    input: Partial<{ name: string; type: string; subject?: string | null; body: string }>,
  ) {
    const [template] = await this.db
      .update(notificationTemplates)
      .set({
        ...input,
        updatedAt: new Date(),
      } as Partial<typeof notificationTemplates.$inferInsert>)
      .where(eq(notificationTemplates.id, id))
      .returning();
    return template ?? null;
  }

  findPreferences(userId: string) {
    return this.db.query.notificationPreferences.findFirst({
      where: eq(notificationPreferences.userId, userId),
    });
  }

  findPreferencesBatch(userIds: string[]) {
    return this.db.query.notificationPreferences.findMany({
      where: inArray(notificationPreferences.userId, userIds),
    });
  }

  async insertDefaultPreferences(userId: string) {
    const [prefs] = await this.db
      .insert(notificationPreferences)
      .values({ userId })
      .returning();
    return prefs ?? null;
  }

  async updatePreferences(userId: string, dto: Record<string, unknown>  ) {
    const [prefs] = await this.db
      .update(notificationPreferences)
      .set(dto as Partial<typeof notificationPreferences.$inferInsert>)
      .where(eq(notificationPreferences.userId, userId))
      .returning();
    return prefs ?? null;
  }

  async insertNotification(input: {
    userId: string;
    templateId: string | null;
    type: typeof notifications.$inferInsert['type'];
    status: typeof notifications.$inferInsert['status'];
    subject: string | null;
    body: string | null;
    metadata: Record<string, unknown>   | null;
    sentAt: Date | null;
  }) {
    const [row] = await this.db
      .insert(notifications)
      .values({
        userId: input.userId,
        templateId: input.templateId,
        type: input.type,
        status: input.status,
        subject: input.subject,
        body: input.body,
        metadata: input.metadata,
        sentAt: input.sentAt,
      })
      .returning();
    return row ?? null;
  }

  async insertNotifications(inputs: {
    userId: string;
    templateId: string | null;
    type: typeof notifications.$inferInsert['type'];
    status: typeof notifications.$inferInsert['status'];
    subject: string | null;
    body: string | null;
    metadata: Record<string, unknown>   | null;
    sentAt: Date | null;
  }[]) {
    if (inputs.length === 0) return [];
    return this.db
      .insert(notifications)
      .values(inputs.map(input => ({
        userId: input.userId,
        templateId: input.templateId,
        type: input.type,
        status: input.status,
        subject: input.subject,
        body: input.body,
        metadata: input.metadata,
        sentAt: input.sentAt,
      })))
      .returning();
  }

  async updateNotification(id: string, patch: Record<string, unknown>  ) {
    const [row] = await this.db
      .update(notifications)
      .set(patch as Partial<typeof notifications.$inferInsert>)
      .where(eq(notifications.id, id))
      .returning();
    return row ?? null;
  }

  listUserNotifications(userId: string) {
    return this.db.query.notifications.findMany({
      where: eq(notifications.userId, userId),
      orderBy: (n, { desc }) => [desc(n.createdAt)],
    });
  }
}




