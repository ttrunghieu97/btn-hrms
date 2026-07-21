import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TasksRepository } from "../repositories/tasks.repository";
import { TaskNotificationsService } from "../notifications/task-notifications.service";
import { RedisService } from "../../../../infrastructure/redis/redis.service";
import { withCronLease } from "../../../../shared/utils/cron-lease.util";

@Injectable()
export class TaskReminderService implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly tasksRepo: TasksRepository,
    private readonly notifications: TaskNotificationsService,
    private readonly redis: RedisService,
  ) {}

  onModuleInit() {
    const intervalMs = Number(
      this.config.get("TASK_REMINDER_INTERVAL_MS") || 6 * 60 * 60 * 1000,
    );
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) return;
    this.timer = setInterval(() => {
      this.run().catch(() => undefined);
    }, intervalMs);
    this.run().catch(() => undefined);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async run() {
    const intervalMs = Number(
      this.config.get("TASK_REMINDER_INTERVAL_MS") || 6 * 60 * 60 * 1000,
    );
    const ttlSeconds = Math.max(Math.ceil(intervalMs / 1000) + 60, 300);

    await withCronLease(
      this.redis.getClientOrNull(),
      "hrms:cron-lease:tasks:reminders",
      ttlSeconds,
      () => undefined,
      async () => {
        const now = new Date();
        const nextDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const candidates = await this.tasksRepo.listReminderCandidates(
          now,
          nextDay,
        );

        for (const task of candidates) {
          if (!task.assigneeId) continue;
          const assigneeUserId = await this.tasksRepo.getUserIdByEmployeeId(
            task.assigneeId,
          );
          if (!assigneeUserId) continue;

          const isOverdue =
            task.dueDate && new Date(task.dueDate).getTime() < now.getTime();
          const title = isOverdue ? "Công việc đã quá hạn" : "Sắp đến hạn";
          const body = task.title ?? "";

          await this.notifications.create({
            userId: assigneeUserId,
            taskId: task.id,
            type: isOverdue ? "task_overdue" : "task_due_soon",
            title,
            body,
          });

          await this.tasksRepo.updateReminderAt(task.id, now);
        }
      },
    );
  }
}
