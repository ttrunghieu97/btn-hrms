import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { TaskNotificationsService } from "../notifications/task-notifications.service";
import { TaskEventPublisher } from "../../events/task-event-publisher";
import { TaskSlaRepository } from "../repositories/task-sla.repository";
import { RedisService } from "../../../../infrastructure/redis/redis.service";
import { withCronLease } from "../../../../shared/utils/cron-lease.util";

@Injectable()
export class TaskSlaService {
  private readonly logger = new Logger(TaskSlaService.name);

  constructor(
    private readonly repo: TaskSlaRepository,
    private readonly notifications: TaskNotificationsService,
    private readonly eventPublisher: TaskEventPublisher,
    private readonly redis: RedisService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkSlaBreaches() {
    await withCronLease(
      this.redis.getClientOrNull(),
      "hrms:cron-lease:tasks:sla",
      300,
      () => this.logger.debug("Skipping SLA breaches because another instance holds the lease"),
      async () => {
        this.logger.debug("Checking for SLA breaches...");

        const now = new Date();

        const [activeTasks, submittedTasks] = await Promise.all([
          this.repo.findActiveTasks(),
          this.repo.findSubmittedTasks(),
        ]);
        const priorities = [
          ...new Set([...activeTasks, ...submittedTasks].map((task) => task.priority)),
        ];
        const slaRules = await this.repo.findSlaRulesByPriorities(priorities);
        const slaRuleByPriority = new Map(
          slaRules.map((rule: any) => [rule.priority, rule]),
        );

        for (const task of activeTasks) {
      const slaRule = slaRuleByPriority.get(task.priority);

      if (!slaRule) continue;

      // Use startedAt if available (task accepted), otherwise fall back to createdAt
      const clockAnchor = task.startedAt
        ? new Date(task.startedAt)
        : new Date(task.createdAt);

      const deadline = task.dueDate
        ? new Date(task.dueDate)
        : new Date(clockAnchor.getTime() + slaRule.maxDurationMinutes * 60_000);

      if (
        slaRule.notifyBeforeMinutes &&
        now.getTime() >=
          deadline.getTime() - slaRule.notifyBeforeMinutes * 60_000 &&
        now.getTime() < deadline.getTime()
      ) {
        if (slaRule.escalateToUserId) {
          await this.notifications.create({
            userId: slaRule.escalateToUserId,
            taskId: task.id,
            type: "task_sla_due_soon",
            title: "Task SLA due soon",
            body: `Task "${task.title}" is approaching its SLA deadline.`,
          });
        }

        await this.eventPublisher.publish({
          eventType: "task.due_soon",
          aggregateId: task.id,
          actorUserId: null,
          payload: {
            taskId: task.id,
            taskTitle: task.title,
            dueDate: deadline.toISOString(),
            assigneeEmployeeId: task.assigneeId ?? null,
          },
        });
      }

      if (now.getTime() >= deadline.getTime()) {
        if (slaRule.escalateToUserId) {
          await this.notifications.create({
            userId: slaRule.escalateToUserId,
            taskId: task.id,
            type: "task_sla_breach",
            title: "Task SLA breach",
            body: `Task "${task.title}" has breached SLA deadline.`,
          });
          this.logger.warn(
            `Escalated task ${task.id} to user ${slaRule.escalateToUserId} due to SLA breach`,
          );
        }

        await this.eventPublisher.publish({
          eventType: "task.overdue",
          aggregateId: task.id,
          actorUserId: null,
          payload: {
            taskId: task.id,
            taskTitle: task.title,
            dueDate: deadline.toISOString(),
            assigneeEmployeeId: task.assigneeId ?? null,
          },
        });
      }
    }

        // ── Approval latency SLA: submitted tasks awaiting manager approval ───────
        for (const task of submittedTasks) {
          const slaRule = slaRuleByPriority.get(task.priority);

          if (!slaRule?.approvalLatencyMinutes) continue;
          if (!task.submittedAt) continue;

          const submittedAt = new Date(task.submittedAt);
          const approvalDeadline = new Date(
            submittedAt.getTime() + slaRule.approvalLatencyMinutes * 60_000,
          );

          if (now.getTime() >= approvalDeadline.getTime()) {
            if (slaRule.escalateToUserId) {
              await this.notifications.create({
                userId: slaRule.escalateToUserId,
                taskId: task.id,
                type: "task_approval_overdue",
                title: "Task awaiting approval",
                body: `Task "${task.title}" has been submitted but not approved within the SLA window.`,
              });
            }

            await this.eventPublisher.publish({
              eventType: "task.approval_overdue",
              aggregateId: task.id,
              actorUserId: null,
              payload: {
                taskId: task.id,
                taskTitle: task.title,
                submittedAt: submittedAt.toISOString(),
                approvalDeadline: approvalDeadline.toISOString(),
                assigneeEmployeeId: task.assigneeId ?? null,
              },
            });
          }
        }
      },
    );
  }
}


