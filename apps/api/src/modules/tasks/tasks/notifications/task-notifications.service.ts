import { Injectable } from "@nestjs/common";
import { TaskNotificationsRepository } from "./task-notifications.repository";
import { TaskNotificationResponseDto } from "./task-notification.dto";
import {
  type AppDatabase,
  type AppTransaction,
} from "../../../../infrastructure/database/database-client.type";

@Injectable()
export class TaskNotificationsService {
  constructor(private readonly repo: TaskNotificationsRepository) {}

  async create(
    data: {
      userId: string;
      taskId: string;
      type: string;
      title: string;
      body?: string | null;
    },
    db?: AppDatabase | AppTransaction,
  ) {
    const row = await this.repo.create(
      {
        userId: data.userId,
        taskId: data.taskId,
        type: data.type,
        title: data.title,
        body: data.body ?? null,
        isRead: false,
      },
      db,
    );

    return row;
  }

  async listForUser(
    userId: string,
  ): Promise<{ data: TaskNotificationResponseDto[] }> {
    const rows = await this.repo.listByUser(userId);
    return {
      data: rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        taskId: row.taskId,
        type: row.type,
        title: row.title,
        body: row.body ?? null,
        isRead: row.isRead,
        createdAt: row.createdAt,
      })),
    };
  }

  async markRead(userId: string, id: string) {
    const row = await this.repo.markRead(userId, id);
    return { data: row ?? null };
  }

  async markAllRead(userId: string) {
    return this.repo.markAllRead(userId);
  }
}
