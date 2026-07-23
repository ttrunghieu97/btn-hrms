import { Injectable } from "@nestjs/common";
import { TasksRepository } from "../repositories/tasks.repository";
import { TasksTransactionsRepository } from "../repositories/tasks-transactions.repository";
import { TaskNotificationsService } from "../notifications/task-notifications.service";
import { TaskEventsService } from "../realtime/task-events.service";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { Permissions } from "../../../../core/security/permissions/permissions.registry";
import { type AuthUser } from "../../../../core/security/types/auth-user.interface";
import { throwBadRequest, throwForbidden, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { TaskMapper } from "../mappers/task.mapper";
import { ReassignTaskDto } from "../dto/reassign-task.dto";

@Injectable()
export class ReassignTaskUseCase {
  private readonly logger: ContextLogger;

  constructor(
    private readonly txRepo: TasksTransactionsRepository,
    private readonly tasksRepo: TasksRepository,
    private readonly notifications: TaskNotificationsService,
    private readonly taskEvents: TaskEventsService,
    private readonly eventOutbox: EventOutboxService,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, ReassignTaskUseCase.name);
  }

  async execute(id: string, dto: ReassignTaskDto, actor: AuthUser) {
    const existing = await this.tasksRepo.findById(id);
    if (!existing) {
      throwNotFound("Task not found", ERROR_CODES.TASK_NOT_FOUND, { taskId: id });
    }

    // Guard: only manager/admin can reassign
    const actorPerms = actor.permissions ?? [];
    const canManageAll = actor.isSuperAdmin || actorPerms.includes("ALL") || actorPerms.includes("tasks:manage");
    const canManageScoped = actorPerms.includes(Permissions.TASKS_EDIT) || actorPerms.includes(Permissions.TASKS_ASSIGN);
    if (!canManageAll && !canManageScoped) {
      throwForbidden("Permission denied: only managers can reassign tasks", ERROR_CODES.PERMISSION_DENIED, { taskId: id });
    }

    // Dept-scope: scoped managers can only reassign tasks in their department
    if (!canManageAll && canManageScoped) {
      const assigneeDeptId = (existing as any)?.assignee?.department?.id ?? (existing as any)?.assignee?.departmentId ?? null;
      if (assigneeDeptId && actor.departmentId && String(assigneeDeptId) !== String(actor.departmentId)) {
        throwForbidden("Permission denied: cannot reassign tasks outside your department", ERROR_CODES.PERMISSION_DENIED, { taskId: id });
      }
    }

    // Cannot reassign if same assignee
    if (existing.assigneeId && String(existing.assigneeId) === String(dto.assigneeId)) {
      throwBadRequest("Task is already assigned to this employee", ERROR_CODES.INVALID_REQUEST, { taskId: id });
    }

    const oldAssigneeId = existing.assigneeId ?? null;
    const newAssigneeId = dto.assigneeId;
    const actorUserId = actor.id ?? null;

    await this.txRepo.transaction(async (tx) => {
      // Update assignee — status stays unchanged
      await this.tasksRepo.updateById(id, { assigneeId: newAssigneeId }, tx);

      // Record assignee change via activity
      await this.tasksRepo.addActivity(
        {
          taskId: id,
          actorUserId,
          action: "assigned",
          fromStatus: existing.status,
          toStatus: existing.status,
          metadata: { oldAssigneeId, newAssigneeId, reason: dto.reason ?? null, isReassign: true },
        },
        tx,
      );

      // Log the reassignment in assignment history
      await this.tasksRepo.addAssignment(id, newAssigneeId, actorUserId, tx);

      // Notifications
      const newAssigneeUserId = await this.tasksRepo.getUserIdByEmployeeId(newAssigneeId, tx);
      if (newAssigneeUserId) {
        await this.notifications.create(
          {
            userId: newAssigneeUserId,
            taskId: id,
            type: "task_assigned",
            title: "B?n du?c giao công vi?c m?i",
            body: existing.title ?? "",
          },
          tx,
        );
      }
      if (oldAssigneeId) {
        const oldAssigneeUserId = await this.tasksRepo.getUserIdByEmployeeId(oldAssigneeId, tx);
        if (oldAssigneeUserId) {
          await this.notifications.create(
            {
              userId: oldAssigneeUserId,
              taskId: id,
              type: "task_updated",
              title: "Công vi?c dã du?c chuy?n ti?p",
              body: `"${existing.title ?? ""}" dã du?c giao l?i cho ngu?i khác`,
            },
            tx,
          );
        }
      }

      // Domain event
      await this.eventOutbox.stage(
        {
          eventType: "task.reassigned",
          aggregateId: id,
          actorUserId,
          payload: { taskId: id, oldAssigneeId, newAssigneeId, reason: dto.reason ?? null },
        },
        tx,
      );
    });

    const loaded = await this.tasksRepo.findById(id);
    const response = TaskMapper.toResponseDto(loaded);

    this.taskEvents.publishTaskEvent({
      action: "task_updated",
      taskId: id,
      task: response,
      assigneeEmployeeId: newAssigneeId,
      actorUserId,
    });

    this.logger.log(`Task ${id} reassigned from ${oldAssigneeId ?? "(none)"} → ${newAssigneeId} by ${actorUserId}`);

    return response;
  }
}
